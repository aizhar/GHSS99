const express = require('express');
const { cloudinary, isConfigured } = require('../cloudinary');

const router = express.Router();

// GET /api/upload-signature
// Returns a short-lived signature so the browser can upload an image DIRECTLY
// to Cloudinary (the API secret never leaves the server, and large image
// bodies never pass through our serverless function).
router.get('/', (req, res) => {
  if (!isConfigured) {
    return res.status(503).json({
      error: 'Image uploads are not configured. Add Cloudinary credentials to enable photos.',
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER || 'ghss99-profiles';

  // The params signed here MUST match the params sent by the browser.
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
});

module.exports = router;
