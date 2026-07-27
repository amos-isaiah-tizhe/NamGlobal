const session = require("express-session");

const env = require("./env");

/**
 * Builds the express-session middleware.
 *
 * Store selection (Section 2.7 / 2.21):
 *   - REDIS_URL set  -> RedisStore (primary; Upstash free tier in production)
 *   - REDIS_URL unset -> MongoStore via connect-mongo, using MONGODB_URI
 *   - Neither set    -> throws. In-memory MemoryStore is never used, in any
 *                       environment, per Section 2.7 ("no session leakage
 *                       between processes") and Section 2.17 (statelessness).
 *
 * Cookie flags follow Section 2.6: secure, httpOnly, sameSite=strict.
 * `secure` is relaxed in development only, since local dev usually runs over
 * plain HTTP without a reverse proxy terminating TLS.
 */
async function buildSessionMiddleware() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate a long random value and set it in .env (never commit it)."
    );
  }

  let store;

  if (process.env.REDIS_URL) {
    const { RedisStore } = require("connect-redis");
    const { getRedisClient } = require("./redisClient");
    const redisClient = await getRedisClient();
    store = new RedisStore({ client: redisClient, prefix: "nam-global:sess:" });
    console.log("Session store: Redis");
  } else if (process.env.MONGODB_URI) {
    const { MongoStore } = require("connect-mongo");
    store = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7, // 7 days
    });
    console.log("Session store: MongoDB (connect-mongo fallback — set REDIS_URL to switch to Redis)");
  } else {
    throw new Error(
      "Neither REDIS_URL nor MONGODB_URI is set. A shared session store is required in every " +
        "environment (Section 2.7) — in-memory MemoryStore is never used, even in development."
    );
  }

  return session({
    name: "nam_global_sid",
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "strict",
      secure: env.isProduction || env.isStaging,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
    // Session ID regeneration on login/privilege change happens in Stage 4's
    // auth controllers (req.session.regenerate(...)) — this file only wires
    // the store and cookie policy.
  });
}

module.exports = buildSessionMiddleware;
