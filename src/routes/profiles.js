const express = require('express');
const mongoose = require('mongoose');
const Profile = require('../models/Profile');
const connectDB = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { cloudinary, isConfigured } = require('../cloudinary');

const router = express.Router();

// Ensure a DB connection before any handler runs.
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

// Only keep fields a client is allowed to set.
function sanitizeBody(body = {}) {
  const out = {};
  if (typeof body.name === 'string') out.name = body.name.trim();
  if (typeof body.section === 'string') out.section = body.section.trim();
  if (typeof body.description === 'string') out.description = body.description.trim();
  if (Array.isArray(body.photos)) {
    out.photos = body.photos
      .filter((p) => p && typeof p.url === 'string')
      .slice(0, 6) // cap number of photos per profile
      .map((p) => ({ url: p.url, publicId: typeof p.publicId === 'string' ? p.publicId : '' }));
  }
  return out;
}

// GET /api/profiles  -> list all (optional ?search=name, ?section=Science)
router.get('/', async (req, res, next) => {
  try {
    const { search, section } = req.query;
    const query = {};

    if (search && search.trim()) {
      // Case-insensitive partial match on name.
      query.name = { $regex: search.trim(), $options: 'i' };
    }
    if (section && section.trim()) {
      query.section = section.trim();
    }

    const profiles = await Profile.find(query).sort({ createdAt: -1 }).lean();
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

// GET /api/profiles/:id  -> single profile
router.get('/:id', async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid profile id.' });
    }
    const profile = await Profile.findById(req.params.id).lean();
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// POST /api/profiles  -> create (public: anyone can add their own profile)
router.post('/', async (req, res, next) => {
  try {
    const data = sanitizeBody(req.body);
    const profile = await Profile.create(data);
    res.status(201).json(profile);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// PUT /api/profiles/:id  -> update (admin only)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid profile id.' });
    }
    const data = sanitizeBody(req.body);
    const profile = await Profile.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json(profile);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// DELETE /api/profiles/:id  -> delete (admin only). Also removes Cloudinary images.
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid profile id.' });
    }
    const profile = await Profile.findByIdAndDelete(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });

    // Best-effort cleanup of stored images; never fail the request over this.
    if (isConfigured && Array.isArray(profile.photos)) {
      const ids = profile.photos.map((p) => p.publicId).filter(Boolean);
      await Promise.allSettled(ids.map((id) => cloudinary.uploader.destroy(id)));
    }

    res.json({ success: true, id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
