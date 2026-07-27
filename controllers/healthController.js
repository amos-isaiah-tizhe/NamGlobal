const mongoose = require("mongoose");
const { getRedisClient } = require("../config/redisClient");

/** GET /health — liveness: is the process up at all? No dependency checks. */
exports.liveness = (req, res) => {
  res.status(200).json({ status: "ok" });
};

/** GET /ready — readiness: are the actual dependencies (DB, Redis) usable? */
exports.readiness = async (req, res) => {
  const checks = { mongodb: false, redis: false };

  checks.mongodb = mongoose.connection.readyState === 1; // 1 = connected

  try {
    const client = await getRedisClient();
    const pong = await client.ping();
    checks.redis = pong === "PONG";
  } catch (err) {
    checks.redis = false;
  }

  const allReady = Object.values(checks).every(Boolean);
  res.status(allReady ? 200 : 503).json({ status: allReady ? "ready" : "not_ready", checks });
};
