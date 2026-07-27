const IORedis = require("ioredis");

let connection = null;

/**
 * BullMQ requires its own ioredis connection with specific options
 * (maxRetriesPerRequest: null) — it can't share the node-redis client used
 * for sessions/caching (config/redisClient.js). Same underlying Redis
 * instance, separate client library, because BullMQ's blocking commands
 * need a connection that isn't also busy serving cache/session traffic.
 */
function getQueueConnection() {
  if (connection) return connection;

  const url = process.env.REDIS_URL || "redis://localhost:6379";
  connection = new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
  });

  return connection;
}

module.exports = { getQueueConnection };
