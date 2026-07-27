const { trackUserSession, untrackUserSession, killUserSessions, killAllSessions } = require("../../services/sessionKillSwitch");
const { getRedisClient } = require("../../config/redisClient");

describe("Session kill-switch (Section 2.23)", () => {
  let client;

  beforeAll(async () => {
    client = await getRedisClient();
  });

  beforeEach(async () => {
    await client.flushDb();
  });

  afterAll(async () => {
    await client.quit();
  });

  test("killUserSessions invalidates only the target user's sessions, leaving others untouched", async () => {
    await trackUserSession("userA", "sessA1");
    await trackUserSession("userA", "sessA2");
    await trackUserSession("userB", "sessB1");

    await client.set("nam-global:sess:sessA1", "data");
    await client.set("nam-global:sess:sessA2", "data");
    await client.set("nam-global:sess:sessB1", "data");

    const killedCount = await killUserSessions("userA");
    expect(killedCount).toBe(2);

    expect(await client.exists("nam-global:sess:sessA1")).toBe(0);
    expect(await client.exists("nam-global:sess:sessA2")).toBe(0);
    expect(await client.exists("nam-global:sess:sessB1")).toBe(1); // untouched
  });

  test("killUserSessions on a user with no sessions returns 0 without error", async () => {
    const count = await killUserSessions("nonexistent-user");
    expect(count).toBe(0);
  });

  test("untrackUserSession removes a session from the index without killing it", async () => {
    await trackUserSession("userC", "sessC1");
    await trackUserSession("userC", "sessC2");
    await untrackUserSession("userC", "sessC1");

    await client.set("nam-global:sess:sessC1", "data");
    await client.set("nam-global:sess:sessC2", "data");

    const killedCount = await killUserSessions("userC");
    expect(killedCount).toBe(1); // only sessC2 was still tracked
    expect(await client.exists("nam-global:sess:sessC1")).toBe(1); // untracked session survives the per-user kill
  });

  test("killAllSessions invalidates every session regardless of user", async () => {
    await client.set("nam-global:sess:x1", "data");
    await client.set("nam-global:sess:x2", "data");
    await client.set("nam-global:sess:x3", "data");
    await client.set("some-other-unrelated-key", "data"); // must NOT be touched

    const killedCount = await killAllSessions();
    expect(killedCount).toBe(3);

    expect(await client.exists("nam-global:sess:x1")).toBe(0);
    expect(await client.exists("nam-global:sess:x2")).toBe(0);
    expect(await client.exists("nam-global:sess:x3")).toBe(0);
    expect(await client.exists("some-other-unrelated-key")).toBe(1); // unrelated keys are safe
  });
});
