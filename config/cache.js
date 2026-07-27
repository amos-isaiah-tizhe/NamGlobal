const { getRedisClient, isRedisConfigured } = require("./redisClient");

/**
 * Section 2.17 — "Introduce Redis as a caching layer for expensive/frequent
 * reads (homepage data, category listings, product detail pages) with
 * sensible TTLs and explicit cache invalidation on product/category/price
 * updates."
 *
 * Section 2.21 makes Redis optional (sessions fall back to connect-mongo).
 * Caching must degrade the same way: if Redis isn't configured, or a Redis
 * call fails for any reason, every function here falls back to "just run
 * the query, don't cache it" rather than letting the error propagate. A
 * previous version of this file did not do this — it let a missing/failed
 * Redis connection throw all the way up through every page controller that
 * uses caching (i.e. the whole storefront), producing a hard 500 on every
 * request in exactly the "no Redis configured" setup this project's own
 * docs describe as supported. Confirmed and fixed after a real user hit it
 * running the app for the first time.
 *
 * Invalidation strategy (unchanged): a single "cache:version" counter is
 * embedded in every key; any admin write bumps the version once, instantly
 * orphaning every previously-cached entry.
 */

let hasLoggedDegradedMode = false;

function logDegradedOnce(reason) {
  if (hasLoggedDegradedMode) return;
  console.warn(`Caching disabled (${reason}) — pages will still work, just without the Redis cache layer.`);
  hasLoggedDegradedMode = true;
}

async function getCacheVersion() {
  if (!isRedisConfigured()) return "0";
  try {
    const client = await getRedisClient();
    const version = await client.get("cache:version");
    // Falls back to "0" — NOT "1" — because Redis's INCR on a missing key
    // starts it at 0 then increments to 1. If this defaulted to "1" instead,
    // the very first bumpCacheVersion() call would produce "1" too, making
    // the first invalidation silently a no-op.
    return version || "0";
  } catch (err) {
    logDegradedOnce(err.message);
    return "0";
  }
}

async function bumpCacheVersion() {
  if (!isRedisConfigured()) return;
  try {
    const client = await getRedisClient();
    await client.incr("cache:version");
  } catch (err) {
    logDegradedOnce(err.message);
    // Nothing to invalidate if nothing was ever cached — safe to no-op.
  }
}

async function buildKey(parts) {
  const version = await getCacheVersion();
  return `cache:v${version}:${parts.join(":")}`;
}

/**
 * Read-through cache: returns the cached value if present, otherwise calls
 * fetchFn(), caches the (JSON-serializable) result, and returns it. If
 * Redis is unavailable for any reason, just calls fetchFn() directly —
 * the page still renders correctly, only without caching.
 */
async function getOrSet(keyParts, ttlSeconds, fetchFn) {
  if (!isRedisConfigured()) return fetchFn();

  try {
    const client = await getRedisClient();
    const key = await buildKey(keyParts);

    const cached = await client.get(key);
    if (cached !== null) {
      return JSON.parse(cached);
    }

    const fresh = await fetchFn();
    await client.set(key, JSON.stringify(fresh), { EX: ttlSeconds });
    return fresh;
  } catch (err) {
    logDegradedOnce(err.message);
    return fetchFn();
  }
}

module.exports = { getOrSet, bumpCacheVersion, getCacheVersion };
