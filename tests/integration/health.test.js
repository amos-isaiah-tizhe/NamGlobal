const request = require("supertest");
const express = require("express");
const healthController = require("../../controllers/healthController");

function buildMinimalApp() {
  const app = express();
  app.get("/health", healthController.liveness);
  app.get("/ready", healthController.readiness);
  return app;
}

describe("Health/readiness endpoints (Section 2.17/2.19)", () => {
  test("GET /health always returns 200 — pure liveness, no dependency checks", async () => {
    const app = buildMinimalApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("GET /ready reports per-dependency status and 503 when something is down", async () => {
    // This runs regardless of whether MongoDB is actually reachable in this
    // environment — mongoose.connection.readyState will simply be
    // disconnected (0) rather than connected (1) if there's no live DB,
    // which is itself the exact behavior being tested: an honest 503, not a
    // false-positive 200.
    const app = buildMinimalApp();
    const res = await request(app).get("/ready");

    expect(res.body).toHaveProperty("checks.mongodb");
    expect(res.body).toHaveProperty("checks.redis");
    expect([200, 503]).toContain(res.status);

    const allTrue = res.body.checks.mongodb && res.body.checks.redis;
    expect(res.status).toBe(allTrue ? 200 : 503);
  });
});
