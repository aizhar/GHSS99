const mongoose = require('mongoose');

// Sections offered by the school for the Matric class. Edit this list to
// match your batch; it is enforced on the server and used by the frontend.
const SECTIONS = ['Science', 'Arts', 'General'];

const profileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      enum: {
        values: SECTIONS,
        message: 'Section must be one of: ' + SECTIONS.join(', '),
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
      default: '',
    },
    // Array of Cloudinary image objects: { url, publicId }.
    photos: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, default: '' },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// Text index so name search is fast even with many profiles.
profileSchema.index({ name: 'text' });

profileSchema.statics.SECTIONS = SECTIONS;

module.exports = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
module.exports.SECTIONS = SECTIONS;
