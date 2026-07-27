/**
 * Shared helper: once a passport strategy's verify callback has resolved a
 * user (or a "link_required"/"not_in_org" rejection info object), this
 * finishes the same session lifecycle local login uses — regenerate the
 * session ID (Section 2.7 — fixation prevention) and gate on 2FA if the
 * resulting account is privileged (Section 2.7b — "OAuth login does not
 * bypass any other security control").
 */
const { trackUserSession } = require("../services/sessionKillSwitch");

function completeOAuthLogin(req, res, redirectOnSuccess) {
  return (err, user, info) => {
    if (err) {
      console.error("OAuth error:", err);
      return res.redirect("/login?error=oauth_failed");
    }

    if (!user) {
      if (info?.reason === "link_required") {
        // Section 2.7b — never silently merge accounts. Stage 5+ builds the
        // actual "confirm your password to link accounts" UI; for now this
        // carries the pending info in the query string for that page to read.
        return res.redirect(`/login/link-account?email=${encodeURIComponent(info.email)}`);
      }
      if (info?.reason === "not_in_org") {
        return res.redirect("/login?error=not_authorized_org");
      }
      return res.redirect("/login?error=oauth_failed");
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) return res.redirect("/login?error=session_failed");

      req.session.userId = user._id.toString();
      trackUserSession(user._id.toString(), req.session.id).catch((e) => console.error("trackUserSession failed:", e));

      const isPrivilegedRole = user.role !== "customer";
      if (isPrivilegedRole && !user.twoFactorEnabled) {
        req.session.twoFactorPending = true;
        req.session.mustEnrollTwoFactor = true;
        return res.redirect("/account/2fa/setup");
      }
      if (user.twoFactorEnabled) {
        req.session.twoFactorPending = true;
        return res.redirect("/login/2fa");
      }

      req.session.twoFactorPending = false;
      return res.redirect(redirectOnSuccess);
    });
  };
}

module.exports = { completeOAuthLogin };
