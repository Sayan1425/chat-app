const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNum: { type: String, unique: true, sparse: true },
  phoneSuffix: { type: String },
  username: { type: String, default: "" },

  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    required: [false, 'Email address is required'],
    validate: {
      validator: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please fill a valid email address',
    },
  },

  emailOtp: { type: String },
  emailOtpExpiry: { type: Date }, 

  profilePic: { type: String, default: "" },
  about: { type: String, default: "Hey there! I’m using this app." },

  lastSeen: { type: Date },
  isOnline: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  agreed: { type: Boolean, default: false }

}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
