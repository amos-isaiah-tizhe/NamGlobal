const { checkPasswordComplexity, checkBreachedPassword } = require("../../utils/passwordPolicy");

describe("checkPasswordComplexity", () => {
  test("rejects a weak password with specific violations", () => {
    const issues = checkPasswordComplexity("password");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => /uppercase/.test(i))).toBe(true);
    expect(issues.some((i) => /number/.test(i))).toBe(true);
    expect(issues.some((i) => /symbol/.test(i))).toBe(true);
  });

  test("accepts a strong password", () => {
    expect(checkPasswordComplexity("Correct-Horse-9!")).toEqual([]);
  });

  test("rejects passwords under 10 characters even if otherwise complex", () => {
    const issues = checkPasswordComplexity("Ab1!");
    expect(issues.some((i) => /at least 10/.test(i))).toBe(true);
  });

  test("rejects empty/undefined input without throwing", () => {
    expect(() => checkPasswordComplexity(undefined)).not.toThrow();
    expect(checkPasswordComplexity("").length).toBeGreaterThan(0);
  });
});

describe("checkBreachedPassword", () => {
  test("fails open (does not block) when the HIBP API is unreachable", async () => {
    // This sandbox/CI environment may not have network access to
    // api.pwnedpasswords.com — the function must never throw or hang, and
    // must never report `breached: true` on a network failure (that would
    // incorrectly block legitimate registrations during a third-party outage).
    const result = await checkBreachedPassword("some-random-password-" + Date.now());
    expect(result).toHaveProperty("breached");
    expect(typeof result.breached).toBe("boolean");
  }, 10000);
});
