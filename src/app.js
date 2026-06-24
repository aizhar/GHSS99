const path = require('path');
const express = require('express');
const cors = require('cors');

const Profile = require('./models/Profile');
const profilesRouter = require('./routes/profiles');
const photosRouter = require('./routes/photos');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// --- API routes ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public metadata used by the frontend (e.g. to build the section dropdown).
app.get('/api/meta', (req, res) => {
  res.json({
    title: 'GHSS Farooq Abad — Matric Class of 1999',
    sections: Profile.SECTIONS,
  });
});

app.use('/api/profiles', profilesRouter);
app.use('/api/photos', photosRouter);
app.use('/api/login', authRouter);
app.use('/api/upload-signature', uploadRouter);

// Unknown API route -> JSON 404 (so the frontend never gets HTML for /api/*).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// --- Static frontend ---
// On Vercel the static files are served by the platform from /public, but
// serving them here lets `npm run dev` host the whole app on one port locally.
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// --- Central error handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error.' : err.message,
  });
});

module.exports = app;
