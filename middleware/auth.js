const User = require("../models/User");
const { roleHasPermission } = require("../config/permissions");

/**
 * Loads the current user (if any) onto req.user from the session. Applied
 * globally in server.js so res.locals.user is available to every view
 * (e.g. to show/hide "My Account" vs "Login" in the header).
 */
async function loadUser(req, res, next) {
  if (!req.session.userId) return next();

  try {
    const user = await User.findById(req.session.userId).select("-passwordHash -twoFactorSecret");
    if (!user || !user.isActive) {
      req.session.userId = null;
      return next();
    }
    req.user = user;
    res.locals.user = user;
  } catch (err) {
    console.error("loadUser error:", err);
  }
  next();
}

/** Blocks unauthenticated requests. Requires loadUser to have run first. */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  // Section 2.7 — a login isn't complete until any pending 2FA challenge clears
  if (req.session.twoFactorPending) {
    return res.status(401).json({ error: "Two-factor verification required" });
  }
  next();
}

/** Restricts to specific roles. Prefer can(permission) below where possible (Section 2.7a). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}

/**
 * Section 2.7a — permission-based authorization. Prefer this over
 * requireRole in controllers: "role names change, permission checks
 * shouldn't need to."
 */
function can(permission) {
  return (req, res, next) => {
    if (!req.user || !roleHasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: `Missing permission: ${permission}` });
    }
    next();
  };
}

module.exports = { loadUser, requireAuth, requireRole, can };
