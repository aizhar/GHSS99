// Vercel Serverless Function entry point.
// The `vercel.json` rewrite sends every /api/* request here, and Vercel wraps
// this Express app as a serverless handler. The original URL (e.g.
// /api/profiles) is preserved, so the routes defined in src/app.js match.
const app = require('../src/app');

module.exports = app;
