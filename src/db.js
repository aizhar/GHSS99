const mongoose = require('mongoose');

// In a serverless environment (Vercel) each function invocation may reuse a
// "warm" container. We cache the Mongoose connection on the global object so
// we don't open a new connection on every request (which exhausts Atlas limits).
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to your environment variables.');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        // Keep the pool small — serverless functions are short-lived.
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
