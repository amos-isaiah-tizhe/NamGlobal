const { getRedisClient } = require("../config/redisClient");

const SESSION_PREFIX = "nam-global:sess:";
const USER_SESSIONS_PREFIX = "nam-global:user-sessions:";

/**
 * Section 2.23 — "Maintain a documented, tested procedure for a session
 * kill-switch: the ability to immediately invalidate all active sessions
 * for one account... or globally... by clearing the relevant Redis session
 * keys."
 *
 * Redis-backed sessions (Stage 3) aren't indexed by user ID by default, so
 * a per-user kill-switch needs a secondary index: every login adds the
 * session ID to a Set keyed by user ID; logout/kill removes it. This file
 * is that index plus the two kill-switch operations. Wired into
 * authController/oauthController (track on login) and the logout handler
 * (untrack).
 */

async function trackUserSession(userId, sessionId) {
  const client = await getRedisClient();
  await client.sAdd(`${USER_SESSIONS_PREFIX}${userId}`, sessionId);
}

async function untrackUserSession(userId, sessionId) {
  const client = await getRedisClient();
  await client.sRem(`${USER_SESSIONS_PREFIX}${userId}`, sessionId);
}

/**
 * Kills every active session for one user — e.g. a compromised customer or
 * admin account. Returns the number of sessions invalidated.
 */
async function killUserSessions(userId) {
  const client = await getRedisClient();
  const indexKey = `${USER_SESSIONS_PREFIX}${userId}`;

  const sessionIds = await client.sMembers(indexKey);
  if (sessionIds.length === 0) return 0;

  const sessionKeys = sessionIds.map((id) => `${SESSION_PREFIX}${id}`);
  await client.del(sessionKeys);
  await client.del(indexKey);

  return sessionIds.length;
}

/**
 * Global kill-switch — invalidates EVERY active session on the site.
 * Section 2.23: "...or globally (suspected system-wide breach)." Uses
 * SCAN rather than KEYS so it doesn't block Redis on a large keyspace.
 * Returns the number of sessions invalidated.
 */
async function killAllSessions() {
  const client = await getRedisClient();
  let cursor = "0";
  let deletedCount = 0;

  do {
    const result = await client.scan(cursor, { MATCH: `${SESSION_PREFIX}*`, COUNT: 100 });
    cursor = result.cursor;
    const keys = result.keys;
    if (keys.length > 0) {
      await client.del(keys);
      deletedCount += keys.length;
    }
  } while (cursor !== "0");

  return deletedCount;
}

module.exports = { trackUserSession, untrackUserSession, killUserSessions, killAllSessions };
