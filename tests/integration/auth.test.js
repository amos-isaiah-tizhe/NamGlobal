const request = require("supertest");
const { buildTestApp, clearDatabase, teardown } = require("../helpers/testApp");
const User = require("../../models/User");

let app;

beforeAll(async () => {
  app = await buildTestApp();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await teardown();
});

/** Registers a session-bearing agent and returns it plus a fresh CSRF token for a given page. */
async function getCsrfToken(agent, path) {
  const res = await agent.get(path);
  const match = res.text.match(/_csrf" value="([^"]*)"/);
  return match ? match[1] : null;
}

describe("Registration", () => {
  test("rejects a weak password with specific complexity violations", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/register");

    const res = await agent.post("/register").send({
      _csrf: csrfToken,
      firstName: "Test",
      lastName: "User",
      email: "weakpass@example.com",
      password: "password",
    });

    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test("registers successfully with a strong password and starts a session", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/register");

    const res = await agent.post("/register").send({
      _csrf: csrfToken,
      firstName: "Test",
      lastName: "User",
      email: "newuser@example.com",
      password: "Correct-Horse-9!",
    });

    expect(res.status).toBe(201);
    const user = await User.findOne({ email: "newuser@example.com" });
    expect(user).not.toBeNull();
    expect(user.passwordHash).not.toBe("Correct-Horse-9!"); // must be hashed, never plaintext
  });

  test("rejects a duplicate email", async () => {
    await User.create({
      firstName: "Existing",
      lastName: "User",
      email: "dupe@example.com",
      passwordHash: "irrelevant-for-this-test",
      authProvider: "local",
    });

    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/register");

    const res = await agent.post("/register").send({
      _csrf: csrfToken,
      firstName: "Another",
      lastName: "Person",
      email: "dupe@example.com",
      password: "Correct-Horse-9!",
    });

    expect(res.status).toBe(409);
  });
});

describe("Login", () => {
  const bcrypt = require("bcrypt");

  async function createTestUser(email, password, overrides = {}) {
    const passwordHash = await bcrypt.hash(password, 10);
    return User.create({ firstName: "Test", lastName: "User", email, passwordHash, authProvider: "local", ...overrides });
  }

  test("succeeds with correct credentials", async () => {
    await createTestUser("login-success@example.com", "Correct-Horse-9!");

    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/login");

    const res = await agent.post("/login").send({ _csrf: csrfToken, email: "login-success@example.com", password: "Correct-Horse-9!" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("fails with the wrong password, using a generic error (no user enumeration)", async () => {
    await createTestUser("login-wrongpass@example.com", "Correct-Horse-9!");

    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/login");

    const res = await agent.post("/login").send({ _csrf: csrfToken, email: "login-wrongpass@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  test("returns the SAME generic error for a nonexistent email as for a wrong password", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/login");

    const res = await agent.post("/login").send({ _csrf: csrfToken, email: "does-not-exist@example.com", password: "whatever" });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  test("locks the account after repeated failed attempts (Section 2.7)", async () => {
    await createTestUser("login-lockout@example.com", "Correct-Horse-9!");
    const agent = request.agent(app);

    for (let i = 0; i < 5; i++) {
      const csrfToken = await getCsrfToken(agent, "/login");
      await agent.post("/login").send({ _csrf: csrfToken, email: "login-lockout@example.com", password: "wrong-password" });
    }

    const csrfToken = await getCsrfToken(agent, "/login");
    const res = await agent.post("/login").send({ _csrf: csrfToken, email: "login-lockout@example.com", password: "Correct-Horse-9!" });

    expect(res.status).toBe(423); // locked, even with the CORRECT password now
  });

  test("a privileged role (non-customer) without 2FA is routed into mandatory enrollment, not granted a full session", async () => {
    await createTestUser("admin-no-2fa@example.com", "Correct-Horse-9!", { role: "support_staff" });

    const agent = request.agent(app);
    const csrfToken = await getCsrfToken(agent, "/login");
    const res = await agent.post("/login").send({ _csrf: csrfToken, email: "admin-no-2fa@example.com", password: "Correct-Horse-9!" });

    expect(res.status).toBe(200);
    expect(res.body.requiresTwoFactorEnrollment).toBe(true);
  });
});
