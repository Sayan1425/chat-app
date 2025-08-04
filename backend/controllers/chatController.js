const { uploadFileToCloudinary } = require("../config/Cloudinary");
const Conversation = require("../models/Conversation");
const response = require("../utils/responseHandler");
const Message = require("../models/Message");

const sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, messageStatus, content } = req.body;
        const file = req.file;

        const participants = [senderId, receiverId].sort();

        // Check if conversation exists
        let conversation = await Conversation.findOne({ participants });
        if (!conversation) {
            conversation = new Conversation({ participants });
            await conversation.save();
        }

        let ImageOrVideoURL = null;
        let contentType = null;

        // File upload
        if (file) {
            const uploadFile = await uploadFileToCloudinary(file);
            if (!uploadFile?.secure_url) {
                return response(res, 400, 'Failed to upload file');
            }

            ImageOrVideoURL = uploadFile.secure_url;

            if (file.mimetype.startsWith('image')) {
                contentType = "image";
            } else if (file.mimetype.startsWith('video')) {
                contentType = "video";
            } else {
                return response(res, 400, 'Unsupported file format');
            }
        } else if (content?.trim()) {
            contentType = "text";
        } else {
            return response(res, 400, 'Message content is required');
        }

        const message = new Message({
            conversation: conversation.id,
            sender: senderId,
            receiver: receiverId,
            content,
            contentType,
            ImageOrVideoURL,
            messageStatus
        });

        await message.save();

        if (message.content) {
            conversation.lastMessage = message.id;
        }

        conversation.unreadCount += 1;
        await conversation.save();

        const populateMessage = await Message.findOne(message?._id)
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic");

            //emit socket event for real time
            if(req.io && req.socketUserMap){
                const receiverSocketId = req.socketUserMap.get(receiverId)
                if(receiverSocketId){
                    req.io.to(receiverSocketId).emit("receive_message", populateMessage)
                    message.messageStatus = "delivered"
                    await message.save()
                }
            }

        return response(res, 201, "Message sent successfully", populateMessage);
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

// Get all conversations for the user
const getConversation = async (req, res) => {
    const userId = req.user.userId;
    try {
        const conversation = await Conversation.find({ participants: userId })
            .populate("participants", "username profilePic isOnline lastSeen")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "sender receiver",
                    select: "username profilePic"
                }
            })
            .sort({ updatedAt: -1 });

        return response(res, 200, 'Conversation retrieved successfully', conversation);
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

// Get messages of a specific conversation
const getMessages = async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user.userId;

    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return response(res, 404, 'Conversation not found');
        }

        if (!conversation.participants.includes(userId)) {
            return response(res, 403, 'Not authorized to view this conversation');
        }

        const messages = await Message.find({ conversation: conversationId })
            .populate("sender", "username profilePic")
            .populate("receiver", "username profilePic")
            .sort("createdAt");

        await Message.updateMany(
            {
                conversation: conversationId,
                receiver: userId,
                messageStatus: { $in: ["send", "delivered"] },
            },
            { $set: { messageStatus: "read" } }
        );

        conversation.unreadCount = 0;
        await conversation.save();

        return response(res, 200, "Messages retrieved", messages);
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

// Mark specific messages as read
const markAsRead = async (req, res) => {
    const { messageIds } = req.body;
    const userId = req.user.userId;

    try {
        //get relevent message to determine senders
        const messages = await Message.find({
            _id: { $in: messageIds },
            receiver: userId
        });

        await Message.updateMany(
            { _id: { $in: messageIds }, receiver: userId },
            { $set: { messageStatus: "read" } }
        );

        //emit socket event for notifing to original sender
            if(req.io && req.socketUserMap){
               for(const message of messages){
                const senderSocketId = req.socketUserMap.get(message.sender.toString())
                if(senderSocketId){
                    const updatedMessage = {
                        _id:message._id,
                        messageStatus:"read"
                    }
                    req.io.to(senderSocketId).emit("message_read", updatedMessage)
                    await message.save()
                }
               } 
            }

        return response(res, 200, 'Messages marked as read', messages);
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

// Delete a message
const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user.userId;

    try {
        const message = await Message.findById(messageId);
        if (!message) {
            return response(res, 404, 'Message not found');
        }

        if (message.sender.toString() !== userId) {
            return response(res, 403, 'Not authorized to delete this message');
        }

        await message.deleteOne();

        //emit socket event
        if(req.io && req.socketUserMap){
            const receiverSocketId = req.socketUserMap.get(message.receiver.toString())
            if(receiverSocketId){
              req.io.to(receiverSocketId).emit("message_deleted", messageId)  
            }
        }
        return response(res, 200, "Message deleted");
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

module.exports = {
    sendMessage,
    getConversation,
    getMessages,
    deleteMessage,
    markAsRead
};
