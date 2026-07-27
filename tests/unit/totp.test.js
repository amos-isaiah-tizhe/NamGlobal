const speakeasy = require("speakeasy");
const { generateSecret, verifyToken } = require("../../utils/totp");

describe("TOTP 2FA (Section 2.7)", () => {
  test("a valid current token is accepted", () => {
    const secret = generateSecret("test@namsglobal.com");
    const validToken = speakeasy.totp({ secret: secret.base32, encoding: "base32" });
    expect(verifyToken(secret.base32, validToken)).toBe(true);
  });

  test("an incorrect token is rejected", () => {
    const secret = generateSecret("test@namsglobal.com");
    expect(verifyToken(secret.base32, "000000")).toBe(false);
  });

  test("a token generated for a DIFFERENT secret is rejected", () => {
    const secretA = generateSecret("a@namsglobal.com");
    const secretB = generateSecret("b@namsglobal.com");
    const tokenForB = speakeasy.totp({ secret: secretB.base32, encoding: "base32" });
    expect(verifyToken(secretA.base32, tokenForB)).toBe(false);
  });

  test("each generated secret is unique", () => {
    const secret1 = generateSecret("test@namsglobal.com");
    const secret2 = generateSecret("test@namsglobal.com");
    expect(secret1.base32).not.toBe(secret2.base32);
  });
});
