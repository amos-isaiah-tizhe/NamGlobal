const bcrypt = require("bcrypt");

const User = require("../models/User");
const { checkPasswordComplexity, checkBreachedPassword } = require("../utils/passwordPolicy");
const { generateSecret, generateQrCodeDataUrl, verifyToken } = require("../utils/totp");
const { trackUserSession, untrackUserSession } = require("../services/sessionKillSwitch");

const LOCKOUT_THRESHOLD = 5;
const MAX_LOCKOUT_MINUTES = 60;

/** Exponential backoff: 2^(attempts - threshold) minutes, capped. Section 2.7. */
function computeLockoutMinutes(failedAttempts) {
  const overBy = failedAttempts - LOCKOUT_THRESHOLD + 1;
  return Math.min(Math.pow(2, overBy), MAX_LOCKOUT_MINUTES);
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

exports.showRegisterForm = (req, res) => res.render("auth/register", { title: "Create an account", errors: [] });

exports.register = async (req, res) => {
  const { firstName, lastName, email, password, marketingConsent } = req.body;
  const normalizedEmail = (email || "").toLowerCase().trim();

  const complexityIssues = checkPasswordComplexity(password);
  if (complexityIssues.length > 0) {
    return res.status(400).json({ error: "Weak password", details: complexityIssues });
  }

  const breachResult = await checkBreachedPassword(password);
  if (breachResult.breached) {
    return res.status(400).json({
      error: "This password has appeared in a known data breach. Please choose a different one.",
    });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    passwordHash,
    role: "customer",
    authProvider: "local",
    marketingConsent: !!marketingConsent, // Section 2.23 — explicit lawful basis, not assumed
  });

  // Section 2.7 — regenerate session ID on login to prevent session fixation
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Could not start session" });
    req.session.userId = user._id.toString();
    req.session.twoFactorPending = false; // customers: 2FA optional, off by default
    trackUserSession(user._id.toString(), req.session.id).catch((e) => console.error("trackUserSession failed:", e));
    res.status(201).json({ success: true, userId: user._id });
  });
};

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

exports.showLoginForm = (req, res) => res.render("auth/login", { title: "Log in", errors: [] });

exports.login = async (req, res) => {
  const email = (req.body.email || "").toLowerCase().trim();
  const { password } = req.body;

  const user = await User.findOne({ email }).select("+twoFactorSecret +passwordHash");

  // Deliberately identical error for "no such user" and "wrong password" —
  // don't leak which one it was (standard practice, also blunts user enumeration).
  const genericError = () => res.status(401).json({ error: "Invalid email or password" });

  if (!user || !user.passwordHash) return genericError(); // no passwordHash => OAuth-only account

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil - new Date()) / 60000);
    return res.status(423).json({ error: `Account temporarily locked. Try again in ${minutesLeft} minute(s).` });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      const lockMinutes = computeLockoutMinutes(user.failedLoginAttempts);
      user.lockedUntil = new Date(Date.now() + lockMinutes * 60000);
      console.warn(`Account locked: ${user.email} for ${lockMinutes} minute(s) after ${user.failedLoginAttempts} failed attempts`);
    }
    await user.save();
    return genericError();
  }

  // Successful password check — reset lockout counters
  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  // Section 2.7 — mandatory 2FA for admin/staff roles
  const isPrivilegedRole = user.role !== "customer";

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "Could not start session" });

    req.session.userId = user._id.toString();
    trackUserSession(user._id.toString(), req.session.id).catch((e) => console.error("trackUserSession failed:", e));

    if (isPrivilegedRole && !user.twoFactorEnabled) {
      // Admin/staff without 2FA enrolled yet must set it up before proceeding —
      // never grant a privileged session without it.
      req.session.twoFactorPending = true;
      req.session.mustEnrollTwoFactor = true;
      return res.status(200).json({ success: true, requiresTwoFactorEnrollment: true });
    }

    if (user.twoFactorEnabled) {
      req.session.twoFactorPending = true;
      return res.status(200).json({ success: true, requiresTwoFactorCode: true });
    }

    req.session.twoFactorPending = false;
    res.status(200).json({ success: true });
  });
};

// ---------------------------------------------------------------------------
// 2FA — enrollment (setup + confirm) and per-login verification
// ---------------------------------------------------------------------------

exports.setupTwoFactor = async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const secret = generateSecret(user.email);
  const qrDataUrl = await generateQrCodeDataUrl(secret.otpauth_url);

  // Stored temporarily on the session until confirmed via verifyTwoFactorSetup,
  // so an abandoned setup never leaves a half-enabled secret on the user record.
  req.session.pendingTwoFactorSecret = secret.base32;

  res.status(200).json({ qrCode: qrDataUrl, manualEntryKey: secret.base32 });
};

exports.verifyTwoFactorSetup = async (req, res) => {
  const { token } = req.body;
  const pendingSecret = req.session.pendingTwoFactorSecret;

  if (!pendingSecret) return res.status(400).json({ error: "No pending 2FA setup for this session" });

  const isValid = verifyToken(pendingSecret, token);
  if (!isValid) return res.status(400).json({ error: "Invalid code. Please try again." });

  const user = await User.findById(req.session.userId);
  user.twoFactorSecret = pendingSecret;
  user.twoFactorEnabled = true;
  await user.save();

  delete req.session.pendingTwoFactorSecret;
  delete req.session.mustEnrollTwoFactor;
  req.session.twoFactorPending = false;

  res.status(200).json({ success: true });
};

exports.verifyTwoFactorLogin = async (req, res) => {
  const { token } = req.body;

  if (!req.session.userId || !req.session.twoFactorPending) {
    return res.status(400).json({ error: "No pending two-factor login for this session" });
  }

  const user = await User.findById(req.session.userId).select("+twoFactorSecret");
  if (!user || !user.twoFactorEnabled) return res.status(400).json({ error: "Two-factor is not enabled for this account" });

  const isValid = verifyToken(user.twoFactorSecret, token);
  if (!isValid) return res.status(401).json({ error: "Invalid two-factor code" });

  req.session.twoFactorPending = false;
  res.status(200).json({ success: true });
};

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

exports.logout = (req, res) => {
  const userId = req.session.userId;
  const sessionId = req.session.id;

  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });
    res.clearCookie("nam_global_sid");
    if (userId) {
      untrackUserSession(userId, sessionId).catch((e) => console.error("untrackUserSession failed:", e));
    }
    res.status(200).json({ success: true });
  });
};
