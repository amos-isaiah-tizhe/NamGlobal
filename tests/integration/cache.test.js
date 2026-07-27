const { getOrSet, bumpCacheVersion, getCacheVersion } = require("../../config/cache");
const { getRedisClient } = require("../../config/redisClient");

/**
 * These tests need a real Redis instance (REDIS_URL in .env.test). Unlike
 * most of the suite, this doesn't need MongoDB at all — config/cache.js is
 * Redis-only — so it's one of the few integration suites runnable without
 * a full test database.
 */
describe("Redis-backed cache (Section 2.17)", () => {
  beforeEach(async () => {
    const client = await getRedisClient();
    await client.flushDb();
  });

  afterAll(async () => {
    const client = await getRedisClient();
    await client.quit();
  });

  test("caches the result of an expensive fetch on first call, reuses it on the second", async () => {
    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount++;
      return { data: "result" };
    };

    await getOrSet(["test", "key"], 60, fetchFn);
    await getOrSet(["test", "key"], 60, fetchFn);

    expect(fetchCount).toBe(1);
  });

  test("bumping the cache version invalidates previously-cached entries", async () => {
    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount++;
      return { fetchCount };
    };

    await getOrSet(["test", "key"], 60, fetchFn);
    await bumpCacheVersion();
    await getOrSet(["test", "key"], 60, fetchFn);

    expect(fetchCount).toBe(2);
  });

  test("version bump correctly handles the transition from an unset version (regression test)", async () => {
    // This is the exact scenario that caught a real bug in Stage 10: the
    // version default must not collide with the value Redis's own INCR
    // produces on a missing key's first increment.
    const versionBeforeAnyBump = await getCacheVersion();
    await bumpCacheVersion();
    const versionAfterFirstBump = await getCacheVersion();

    expect(versionAfterFirstBump).not.toBe(versionBeforeAnyBump);
  });

  test("different key parts produce independent cache entries", async () => {
    let fetchCountA = 0;
    let fetchCountB = 0;

    await getOrSet(["product", "a"], 60, async () => { fetchCountA++; return "a"; });
    await getOrSet(["product", "b"], 60, async () => { fetchCountB++; return "b"; });
    await getOrSet(["product", "a"], 60, async () => { fetchCountA++; return "a"; });

    expect(fetchCountA).toBe(1);
    expect(fetchCountB).toBe(1);
  });
});

describe("Graceful degradation when Redis is NOT configured (regression test)", () => {
  // A real user hit this: with REDIS_URL left blank (an explicitly
  // documented, supported configuration — Section 2.21), getOrSet used to
  // throw/hang trying to connect to a guessed default Redis address,
  // producing a hard 500 on every homepage/category/product page. Fixed in
  // config/cache.js + config/redisClient.js; this test locks that in.
  const originalRedisUrl = process.env.REDIS_URL;

  beforeAll(() => {
    delete process.env.REDIS_URL;
    jest.resetModules();
  });

  afterAll(() => {
    if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
    jest.resetModules();
  });

  test("getOrSet falls back to calling fetchFn directly, near-instantly, no error thrown", async () => {
    const { getOrSet: getOrSetWithoutRedis } = require("../../config/cache");

    const start = Date.now();
    const result = await getOrSetWithoutRedis(["test", "no-redis"], 60, async () => ({ data: "fresh" }));
    const elapsed = Date.now() - start;

    expect(result).toEqual({ data: "fresh" });
    expect(elapsed).toBeLessThan(500); // must not hang waiting on a connection attempt
  });

  test("bumpCacheVersion does not throw when Redis isn't configured", async () => {
    const { bumpCacheVersion: bumpWithoutRedis } = require("../../config/cache");
    await expect(bumpWithoutRedis()).resolves.not.toThrow();
  });
});
