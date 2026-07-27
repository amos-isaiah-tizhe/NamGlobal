const { createClient } = require("redis");

let client = null;
let hasLoggedConnectionError = false;

/**
 * Whether Redis is actually configured for this deployment. Section 2.21's
 * free-tier posture makes Redis optional — sessions fall back to
 * connect-mongo (config/session.js already does this correctly). Every
 * OTHER Redis consumer (caching, the session kill-switch, BullMQ) must
 * check this too, rather than let getRedisClient() silently guess a
 * default connection that was never actually requested.
 */
function isRedisConfigured() {
  return !!process.env.REDIS_URL;
}

/**
 * Returns a connected, shared Redis client — but ONLY if REDIS_URL is
 * actually set. Previously this defaulted to redis://localhost:6379 even
 * when REDIS_URL was intentionally left blank, which meant every Redis-
 * dependent feature (crucially, config/cache.js, used on every homepage/
 * category/product page render) tried to connect to a Redis that was never
 * configured, retried indefinitely, and eventually timed out — a hard 500
 * on the entire storefront in exactly the "no Redis" setup the docs
 * describe as supported. Fixed: callers must check isRedisConfigured()
 * first (config/cache.js now does) rather than call this blindly.
 */
async function getRedisClient() {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  if (client && client.isOpen) return client;

  client = createClient({
    url: process.env.REDIS_URL,
    socket: {
      // Bounded retries — Section 2.17 wants resilience, not an infinite
      // reconnect storm that floods logs when Redis is genuinely down.
      reconnectStrategy: (retries) => {
        if (retries > 5) return new Error("Redis reconnect attempts exhausted");
        return Math.min(retries * 200, 2000);
      },
      connectTimeout: 5000,
    },
  });

  client.on("error", (err) => {
    // Log once, not on every retry — the previous version logged an
    // identical stack trace repeatedly, which is exactly what the report
    // that caught this bug showed.
    if (!hasLoggedConnectionError) {
      console.error("Redis client error (further identical errors suppressed):", err.message);
      hasLoggedConnectionError = true;
    }
  });

  client.on("ready", () => {
    hasLoggedConnectionError = false; // a later successful (re)connect resets this
  });

  await client.connect();
  return client;
}

module.exports = { getRedisClient, isRedisConfigured };
