// Local development server. On Vercel this file is NOT used — api/index.js is
// the entry point. Run locally with `npm run dev` (auto-reload) or `npm start`.
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/db');

const PORT = process.env.PORT || 3000;

// Connect eagerly on boot so local startup fails fast if the DB is misconfigured.
connectDB()
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    console.error('  The server will still start; API calls needing the DB will error.');
  });

app.listen(PORT, () => {
  console.log(`\n  GHSS99 portal running at  http://localhost:${PORT}\n`);
});
