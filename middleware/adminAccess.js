const { requireAuth } = require("./auth");

/**
 * Section 2.7 — "Serve the admin dashboard on a separate route prefix... with
 * its own stricter rate limits." This is the baseline gate every /admin
 * route sits behind: must be authenticated AND hold a staff/admin role.
 * Individual routes layer can(permission) on top for the specific action
 * (Section 2.7a) — this middleware only keeps customers out entirely.
 */
function requireAdminSurface(req, res, next) {
  if (!req.user || req.user.role === "customer") {
    return res.status(403).render("errors/404", { title: "Not found" }); // don't reveal /admin exists to non-staff
  }
  next();
}

module.exports = [requireAuth, requireAdminSurface];
