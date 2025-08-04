const multer = require('multer'); // for storing files locally
const cloudinary = require('cloudinary').v2; // to upload to cloudinary
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, 
});

// Upload file to Cloudinary
const uploadFileToCloudinary = (file) => {
  const options = {
    resource_type: file.mimetype.startsWith('video') ? 'video' : 'image', 
  };

  return new Promise((resolve, reject) => {
    const uploader = file.mimetype.startsWith('video') 
      ? cloudinary.uploader.upload_large 
      : cloudinary.uploader.upload;

    uploader(file.path, options, (error, result) => {
      // Clean up local file
      fs.unlink(file.path, () => {});
      if (error) return reject(error);
      resolve(result);
    });
  });
};

// Multer middleware
const multerMiddleware = multer({ dest: 'uploads/' }).single('media');

module.exports = {
  uploadFileToCloudinary,
  multerMiddleware
};
