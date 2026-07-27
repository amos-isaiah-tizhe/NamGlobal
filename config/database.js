/**
 * config/database.js
 *
 * A single shared Mongoose connection per process (Section 2.17 — "use
 * MongoDB connection pooling correctly: a single shared client per process,
 * not one per request"). Import `connectDB()` once from server.js; every
 * model file just does `require("mongoose")` and defines its schema against
 * the default connection.
 */

const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill in a MongoDB Atlas connection string (Section 2.21 — Atlas M0 free tier is fine to start)."
    );
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000, // fail fast and clearly instead of hanging ~30s on a bad URI
  });

  isConnected = true;
  console.log("MongoDB connected");

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  return mongoose.connection;
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = { connectDB, disconnectDB, mongoose };
