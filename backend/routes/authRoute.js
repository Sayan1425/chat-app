const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/Cloudinary');

const router = express.Router();

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

router.get('/log-out', authController.logout);

//protected route
router.put('/update-profile', authMiddleware, multerMiddleware, authController.updateProfile)
router.get('/check-auth', authMiddleware, authController.checkAuthentication);
router.get('/users', authMiddleware, authController.getAllUsers);

module.exports = router;