const sendOtpToEmail = require("../services/emailService");
const response = require("../utils/responseHandler");
const User = require("../models/User");
const otpGenerate = require("../utils/otpGenerator");
const twilio = require("../services/twilioService");
const tokenGenerate = require("../utils/tokenGenerator");
const { uploadFileToCloudinary } = require("../config/Cloudinary");
const Conversation = require('../models/Conversation');

// Send OTP
const sendOtp = async (req, res) => {
  const { phoneNum, phoneSuffix, email } = req.body;
  const otp = otpGenerate();
  const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
  let user;

  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }

      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendOtpToEmail(email, otp);

      return response(res, 200, "OTP is sent to your email", { email });
    }

    if (!phoneNum || !phoneSuffix) {
      return response(res, 400, 'Incorrect country code or phone number');
    }

    const fullPhoneNum = `${phoneSuffix}${phoneNum}`; // Country code first
    user = await User.findOne({ phoneNum });

    if (!user) {
      user = new User({ phoneNum, phoneSuffix });
    }

    await twilio.sendOtpToNum(fullPhoneNum);
    await user.save();

    return response(res, 200, 'OTP is sent to your phone number');
  } catch (error) {
    console.error(error);
    return response(res, 500, 'Internal server error');
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  const { phoneNum, phoneSuffix, email, otp } = req.body;
  try {
    let user;

    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 404, 'User not found');
      }

      const now = new Date();
      if (!user.emailOtp || String(user.emailOtp) !== String(otp) || now > new Date(user.emailOtpExpiry)) {
        return response(res, 400, 'Invalid or expired OTP');
      }

      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } else {
      if (!phoneNum || !phoneSuffix) {
        return response(res, 400, 'Incorrect country code or phone number');
      }

      const fullPhoneNum = `${phoneSuffix}${phoneNum}`;
      user = await User.findOne({ phoneNum });

      if (!user) {
        return response(res, 404, 'User not found');
      }

      const result = await twilio.verifyOtp(fullPhoneNum, otp);
      if (result.status !== 'approved') {
        return response(res, 400, 'Invalid OTP');
      }

      user.isVerified = true;
      await user.save();
    }

    const token = tokenGenerate(user?._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 // 1 year
    });

    return response(res, 200, 'OTP verified', { token, user });
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
};

//profile update
const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId);
    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePic = uploadResult?.secure_url;
    }
    else if (req.body.profilePic) {
      user.profilePic = req.body.profilePic;
    }

    if (username) user.username = username;
    if (agreed) user.agreed = agreed;
    if (about) user.about = about;
    await user.save();
    return response(res, 200, 'user-profile updated', user)

  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
}
//
const checkAuthentication = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(res, 404, "Please login before access!!")
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, 'User not found')
    }
    return response(res, 200, 'User found', user);
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
}


//logout
const logout = (req, res) => {
  try {
    res.cookie("auth_token", "", { expires: new Date(0) })
    return response(res, 200, 'Successfully Log out')

  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
}

//loggedinuser -> sender, user?._id ->receiver
const getAllUsers = async (req, res) => {
  const loggedInUser = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUser } }).select("username profilePic lastSeen isOnline about phoneNum phoneSuffix").lean();

    const usersWithConvo = await Promise.all(users.map(async (user) => {
      const conversation = await Conversation.findOne({
        participants: { $all: [loggedInUser, user?._id] }
      }).populate({
        path: "lastMessage",
        select: "content created at sender & receiver"
      }).lean();
      return {
        ...user,
        conversation: conversation | null
      }
    }
    ));
    return response(res, 200, 'users data retrived', usersWithConvo)
  } catch (error) {
    console.error(error);
    return response(res, 500, "Internal server error");
  }
}


module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthentication,
  getAllUsers
};
