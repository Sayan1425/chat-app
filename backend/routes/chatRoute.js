const express = require('express');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/Cloudinary');

const router = express.Router();

//all are protected routes
// Send a message with file or text
router.post('/send-message', authMiddleware, multerMiddleware, chatController.sendMessage);

// Get all conversations for a user
router.get('/convos', authMiddleware, chatController.getConversation);

// Get all messages in a specific conversation
router.get('/convos/:convoId/messages', authMiddleware, chatController.getMessages);

// Mark messages as read
router.put('/messages/read', authMiddleware, chatController.markAsRead);

// Delete a specific message
router.delete('/messages/:messageId', authMiddleware, chatController.deleteMessage);

module.exports = router;
