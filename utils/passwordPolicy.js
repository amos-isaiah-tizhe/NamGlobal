const crypto = require("crypto");
const https = require("https");

/**
 * Minimum complexity: 10+ chars, at least one uppercase, one lowercase, one
 * digit, one symbol. Returns a list of violation messages (empty = valid).
 */
function checkPasswordComplexity(password) {
  const problems = [];
  if (!password || password.length < 10) problems.push("Password must be at least 10 characters long");
  if (!/[A-Z]/.test(password)) problems.push("Password must include an uppercase letter");
  if (!/[a-z]/.test(password)) problems.push("Password must include a lowercase letter");
  if (!/[0-9]/.test(password)) problems.push("Password must include a number");
  if (!/[^A-Za-z0-9]/.test(password)) problems.push("Password must include a symbol");
  return problems;
}

/**
 * Checks a password against the HaveIBeenPwned range API using k-anonymity
 * (only the first 5 characters of the SHA-1 hash ever leave the server —
 * the full password/hash never does). Section 2.7.
 *
 * Fails OPEN (treats the password as "not found breached") if the API is
 * unreachable, rather than blocking registration/login entirely over a
 * third-party outage — this is a defense-in-depth check, not the only
 * password safeguard in place (complexity rules above still apply).
 */
function checkBreachedPassword(password) {
  return new Promise((resolve) => {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const req = https.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      { timeout: 3000 },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const found = data.split("\n").some((line) => line.split(":")[0] === suffix);
          resolve({ breached: found, checked: true });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy();
      resolve({ breached: false, checked: false });
    });

    req.on("error", () => {
      resolve({ breached: false, checked: false });
    });
  });
}

module.exports = { checkPasswordComplexity, checkBreachedPassword };
