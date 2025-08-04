const { uploadFileToCloudinary } = require("../config/Cloudinary");
const Status = require("../models/Status");
const response = require("../utils/responseHandler");
const Message = require("../models/Message");

const createStatus = async (req, res) => {
    try {
        const { content, ContentType } = req.body;
        const userId = req.user.userId;
        const file = req.file;

        let mediaUrl = null;
        let finalContentType = ContentType || 'text';
        // File upload
        if (file) {
            const uploadFile = await uploadFileToCloudinary(file);
            if (!uploadFile?.secure_url) {
                return response(res, 400, 'Failed to upload file');
            }

            mediaUrl = uploadFile.secure_url;

            if (file.mimetype.startsWith('image')) {
                finalContentType = "image";
            } else if (file.mimetype.startsWith('video')) {
                finalContentType = "video";
            } else {
                return response(res, 400, 'Unsupported file format');
            }
        } else if (content?.trim()) {
            finalContentType = "text";
        } else {
            return response(res, 400, 'Message content is required');
        }

        const expireAt = new Date()
        expireAt.setHours(expireAt.getHours() + 24)

        const status = new Status({
            user: userId,
            content: mediaUrl || content,
            contentType: finalContentType,
            expireAt
        });

        await status.save();

        const populateStatus = await Status.findOne(status?._id)
            .populate("user", "username profilePic")
            .populate("viewers", "username profilePic");

            //emit socket event
            if(req.io && req.socketUserMap){
                //broadcast to all connetcing users except the creaetor
                for(const [connectedUserId, socketId] of req.socketUserMap){
                    if(connectedUserId !== userId){
                        req.io.to(socketId).emit("new_status", populateStatus)
                    }
                }
            }

        return response(res, 201, "Status created successfully", populateStatus);
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

const getStatus = async (req, res) => {
    try {
        const Statuses = await Status.find({
            expireAt: { $gt: new Date() }
        }).populate("user", "username profilePic")
            .populate("viewer", "username profilePic").sort({ createdAt: -1 })
        return response(res, 200, 'status retrived successfully', Statuses)
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
}

const viewStatus = async (req, res) => {
    const { statusId } = req.params
    const userId = req.user.userId
    try {
        const status = await Status.findById(statusId)
        if (!status) {
            return response(res, 404, 'Status not found')
        }
        if (!status.viewers.includes(userId)) {
            status.viewers.push(userId)
            await status.save()
            const updateStatus = await Status.findById(statusId)
            .populate("user", "username profilePic")
            .populate("viewer", "username profilePic")

             //emit socket event
            if(req.io && req.socketUserMap){
                //broadcast to all connetcing users except the creaetor
                const statusOwnerSocketId = req.socketUserMap.get(status.user._id.toString())
                if(statusOwnerSocketId){
                    const viewData = {
                        statusId,
                        viewerId:userId,
                        totalViewer: updateStatus.viewers.length,
                        viewers:updateStatus.viewers
                    }
                    req.io.ti(statusOwnerSocketId).emit("status_viewed", viewData)
                }
                else{
                    console.log("status owner not connected")
                }
            }
        }
        else {
            console.log("User already viewed the status")
        }
        return response(res, 200, 'Status viewed successfully')
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
}

const deleteStatus = async (req, res) => {
    const { statusId } = req.params
    const userId = req.user.userId
    try {
        const status = await Status.findById(statusId)
        if (!status) {
            return response(res, 404, "status not found")
        }
        if (status.user.toString() !== userId) {
            return response(res, 403, "not authorized to delete this status")
        }
        await status.deleteOne();

        //emit socket event
        if(req.io && req.socketUserMap){
            for(const [connectedUserId, socketId] of req.socketUserMap){
                    if(connectedUserId !== userId){
                        req.io.to(socketId).emit("status_deleted", statusId)
                    }
                }
        }

        return response(res, 200, "Status deleted successfully")
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
}

module.exports = {
  createStatus,
  getStatus,
  viewStatus,
  deleteStatus
}