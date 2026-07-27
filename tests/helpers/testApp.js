const mongoose = require("mongoose");
const { createApp } = require("../../server");
const { connectDB, disconnectDB } = require("../../config/database");

/**
 * These MongoDB-dependent integration tests need MONGODB_URI (and REDIS_URL,
 * for sessions) pointed at a real, disposable test instance — see
 * .env.test.example. They are NOT runnable in an environment with no
 * reachable MongoDB; wrap suites that need this helper in the environment
 * checks shown in each test file, or simply run them in CI, where
 * .github/workflows/ci.yml provisions real Mongo/Redis service containers.
 */
async function buildTestApp() {
  await connectDB();
  return createApp();
}

async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

async function teardown() {
  await disconnectDB();
}

module.exports = { buildTestApp, clearDatabase, teardown };
