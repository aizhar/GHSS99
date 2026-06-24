const express = require('express');
const mongoose = require('mongoose');
const Photo = require('../models/Photo');
const connectDB = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { cloudinary, isConfigured } = require('../cloudinary');

const router = express.Router();

router.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// GET /api/photos -> list all gallery photos (public). Optional ?year=1998
router.get('/', async (req, res, next) => {
  try {
    const query = {};
    if (req.query.year && !Number.isNaN(Number(req.query.year))) {
      query.year = Number(req.query.year);
    }
    // Newest uploads first.
    const photos = await Photo.find(query).sort({ createdAt: -1 }).lean();
    res.json(photos);
  } catch (err) {
    next(err);
  }
});

// POST /api/photos -> add a gallery photo (admin only)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const { url, publicId, caption, year } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'A photo URL is required.' });
    }
    const data = {
      url,
      publicId: typeof publicId === 'string' ? publicId : '',
      caption: typeof caption === 'string' ? caption.trim() : '',
    };
    if (year !== undefined && year !== null && year !== '' && !Number.isNaN(Number(year))) {
      data.year = Number(year);
    }
    const photo = await Photo.create(data);
    res.status(201).json(photo);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/photos/:id -> remove a gallery photo (admin only)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid photo id.' });
    }
    const photo = await Photo.findByIdAndDelete(req.params.id);
    if (!photo) return res.status(404).json({ error: 'Photo not found.' });

    if (isConfigured && photo.publicId) {
      await Promise.allSettled([cloudinary.uploader.destroy(photo.publicId)]);
    }

    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
