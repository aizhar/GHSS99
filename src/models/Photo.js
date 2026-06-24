const mongoose = require('mongoose');

// A photo in the shared "old photos" gallery (uploaded by the admin).
// Separate from profile photos.
const photoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Photo URL is required'],
    },
    publicId: {
      type: String,
      default: '',
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, 'Caption must be at most 200 characters'],
      default: '',
    },
    // Optional year the photo was taken (e.g. 1998).
    year: {
      type: Number,
      min: [1950, 'Year looks too early'],
      max: [2035, 'Year looks too far in the future'],
      default: null,
    },
  },
  { timestamps: true }
);

photoSchema.index({ year: 1, createdAt: -1 });

module.exports = mongoose.models.Photo || mongoose.model('Photo', photoSchema);
