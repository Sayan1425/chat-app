const { Server } = require("socket.io");//
const User = require("../models/User");
const Message = require("../models/Message");

//map to store online users -> userId, socketId
const onlineUsers = new Map()

//map to track typing status -> userId -> [conversation]: boolean
const typingUsers = new Map()


//socket initializing
const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        },
        pingTimeout: 6000,//disconnect inactive users or sockets after 60s
    })

    //when a new socket connection is established 
    io.on("connection", (socket) => {
        console.log(`User connected:${socket.id}`)
        let userId = null

        //handle user connection and mark then online in db
        socket.on("user_connected", async (connectingUserId) => {
            try {
                userId = connectingUserId
                onlineUsers.set(userId, socket.id);
                socket.join(userId)//join a personal room for direct emits

                //update user status in db
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date()
                })

                //notify all users that this is now online
                io.emit("user_status", { userId, isOnline: true })
            } catch (error) {
                console.error("error in user connection", error)
            }
        })
        //return online status of requested user
        socket.on("get_user_status", (requestedUserId, callback) => {
            const isOnline = onlineUsers.has(requestedUserId)
            callback({
                userId: requestedUserId,
                isOnline,
                lastSeen: isOnline ? new Date() : null
            })
        })
        //forward message to receiver if online
        socket.on("send_message", async (message) => {
            try {
                const receiverSocketId = onlineUsers.get(message.receiver?._id)
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receive_message", message)
                }
            } catch (error) {
                console.error("Error sending message", error)
                socket.emit("message_error", { error: "failed to send message" })
            }
        })
        //update messages as read and notify sender
        socket.on("message_read", async ({ messageIds, senderId }) => {
            try {
                await Message.updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { messageStatus: "read" } }
                )
                const senderSocketId = onlineUsers.get(senderId)
                if (senderSocketId) {
                    messageIds.forEach((messageId) => {
                        io.to(senderSocketId).emit("message_status_update", {
                            messageId,
                            messageStatus: "read"
                        })
                    })
                }
            } catch (error) {
                console.error("error in message_update", error)
            }
        })
        //handle typing start and auto-stop after 3s
        socket.on("typing_start", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;
            if (!typingUsers.has(userId)) typingUsers.set(userId, {})
            const userTyping = typingUsers.get(userId)
            userTyping[conversationId] = true

            //clear any exiting timeout
            if (userTyping[`${conversationId}_timeout`]) {
                clearTimeout(userTyping[`${conversationId}_timeout`])
            }
            //auto-stop the typing after 3s
            userTyping[`${conversationId}_timeout`] = setTimeout(() => {
                userTyping[conversationId] = false
                socket.to(receiverId).emit("user_typing", {
                    userId,
                    conversationId,
                    isTyping: false
                })
            }, 3000)
            //notify receiver that sender typing
            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping: true
            })
        })

        socket.on("typing_stop", ({ conversationId, receiverId }) => {
            if (!userId || !conversationId || !receiverId) return;
            if (typingUsers.has(userId)){
                const userTyping = typingUsers.get(userId)
                userTyping[conversationId] = false

                if(userTyping[`${conversationId}_timeout`]){
                    clearTimeout(userTyping[`${conversationId}_timeout`])
                    delete userTyping[`${conversationId}_timeout`]
                }
            };
            socket.to(receiverId).emit("user_typing", {
                userId,
                conversationId,
                isTyping:false
            })
        })
        //add reaction on message
        socket.on("add_reaction", async ({messageId, userId, emoji, reactionUserId}) => {
          try {
            const message = await Message.findById(messageId)
            if(!message) return;

            const existingIndex = message.reactions.findIndex(
                (r) => r.user.toString() === reactionUserId
            )
            if(existingIndex > -1){
                const existing = message.reactions(existingIndex)
                if(existing.emoji === emoji){
                    //remove same emoji
                    message.reactions.splice(existingIndex, 1)
                }else{
                    //chnage the emoji
                    message.reactions[existingIndex].emoji = emoji
                }
            }else{
                message.reactions.push({user: reactionUserId, emoji})
            }
            await message.save()
            const populatedMessage = await Message.findOne(message?._id)
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic")
            .populate("reactions.user", "username")

            const reactionUpdated ={
                messageId,
                reactions:populatedMessage.reactions
            }
            const senderSocket = onlineUsers.get(populatedMessage.sender?._id.toString())
            const receiverSocket = onlineUsers.get(populatedMessage.receiver?._id.toString())

            if(senderSocket) io.to(senderSocket).emit("reaction_update", reactionUpdated)
            if(receiverSocket) io.to(receiverSocket).emit("reaction_update", reactionUpdated)
          } catch (error) {
            console.log("error in reaction handling", error)
          }
        })
        //handle disconnection and mark user offline
        const handleDisconnection = async () => {
          if(!userId) return;
          try {
            onlineUsers.delete(userId)
            //clear all typing timeouts
            if(typingUsers.has(userId)){
                const userTyping = typingUsers.get(userId)
                Object.keys(userTyping).forEach((key) =>{
                    if(key.endsWith('_timeout')) clearTimeout(userTyping[key])
                })
            typingUsers.delete(userId)
            }
            await User.findByIdAndUpdate(userId, {
                isOnline:false,
                lastSeen:new Date()
            })
            io.emit("user_status", {
                isOnline:false,
                userId,
                lastSeen: new Date()
            })
            socket.leave(userId)
            console.log(` this user ${userId} is offline`)
          } catch (error) {
            console.error("Error in disconnection handling", error)
          }
        }
        //disconnection event
        socket.on("disconnect", handleDisconnection)
    })
    //attach the online user map to the socket server for external user
    io.socketUserMap = onlineUsers
    return io;
}

module.exports = initSocket;