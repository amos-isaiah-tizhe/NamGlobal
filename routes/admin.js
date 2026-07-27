const express = require("express");
const router = express.Router();

const requireAdminSurface = require("../middleware/adminAccess");
const { can } = require("../middleware/auth");
const { adminLimiter } = require("../middleware/rateLimiters");
const { doubleCsrfProtection } = require("../middleware/csrf");

const dashboardController = require("../controllers/admin/dashboardController");
const productAdminController = require("../controllers/admin/productAdminController");
const categoryAdminController = require("../controllers/admin/categoryAdminController");
const orderAdminController = require("../controllers/admin/orderAdminController");
const couponAdminController = require("../controllers/admin/couponAdminController");
const userAdminController = require("../controllers/admin/userAdminController");
const auditLogAdminController = require("../controllers/admin/auditLogAdminController");
const settingsAdminController = require("../controllers/admin/settingsAdminController");
const ticketAdminController = require("../controllers/admin/ticketAdminController");
const incidentResponseController = require("../controllers/admin/incidentResponseController");

// Section 2.7 — admin-surface isolation: every /admin route sits behind its
// own rate limit and the baseline "must be staff, not a customer" gate,
// applied once here rather than repeated per route.
router.use(adminLimiter);
router.use(...requireAdminSurface);

router.get("/admin", dashboardController.showDashboard);

// ---- Products (Section 2.7a: view vs edit vs price-edit are separate permissions) ----
router.get("/admin/products", can("product:view"), productAdminController.list);
router.get("/admin/products/new", can("product:edit"), productAdminController.showCreateForm);
router.post("/admin/products", can("product:edit"), doubleCsrfProtection, productAdminController.create);
router.get("/admin/products/:id/edit", can("product:edit"), productAdminController.showEditForm);
router.post("/admin/products/:id", can("product:price_edit"), doubleCsrfProtection, productAdminController.update);
router.post("/admin/products/:id/delete", can("product:edit"), doubleCsrfProtection, productAdminController.remove);

// ---- Categories ----
router.get("/admin/categories", can("content:edit"), categoryAdminController.list);
router.post("/admin/categories", can("content:edit"), doubleCsrfProtection, categoryAdminController.create);
router.post("/admin/categories/:id/toggle", can("content:edit"), doubleCsrfProtection, categoryAdminController.toggleActive);

// ---- Orders (Section 2.3 Dispute & Refund Handling) ----
router.get("/admin/orders", can("order:view"), orderAdminController.list);
router.get("/admin/orders/:id", can("order:view"), orderAdminController.showDetail);
router.post("/admin/orders/:id/status", can("order:update_status"), doubleCsrfProtection, orderAdminController.updateStatus);
router.post("/admin/orders/:id/refund", can("order:refund_issue"), doubleCsrfProtection, orderAdminController.refund);

// ---- Coupons ----
router.get("/admin/coupons", can("coupon:manage"), couponAdminController.list);
router.post("/admin/coupons", can("coupon:manage"), doubleCsrfProtection, couponAdminController.create);
router.post("/admin/coupons/:id/toggle", can("coupon:manage"), doubleCsrfProtection, couponAdminController.toggleActive);

// ---- Users & role management (super_admin only, via the '*' wildcard permission) ----
router.get("/admin/users", can("user:manage"), userAdminController.list);
router.post("/admin/users/:id/role", can("user:manage"), doubleCsrfProtection, userAdminController.updateRole);
router.post("/admin/users/:id/toggle-active", can("user:manage"), doubleCsrfProtection, userAdminController.toggleActive);

// ---- Audit logs (super_admin only, read + export — never editable) ----
router.get("/admin/audit-logs", can("audit:view"), auditLogAdminController.list);
router.get("/admin/audit-logs/export", can("audit:view"), auditLogAdminController.exportCsv);

// ---- Site settings (super_admin only) ----
router.get("/admin/settings", can("settings:edit"), settingsAdminController.show);
router.post("/admin/settings", can("settings:edit"), doubleCsrfProtection, settingsAdminController.update);

// ---- Support tickets ----
router.get("/admin/tickets", can("ticket:manage"), ticketAdminController.list);
router.get("/admin/tickets/:id", can("ticket:manage"), ticketAdminController.showDetail);
router.post("/admin/tickets/:id/reply", can("ticket:manage"), doubleCsrfProtection, ticketAdminController.reply);

// ---- Incident response / session kill-switch (Section 2.23, super_admin only) ----
router.get("/admin/incident-response", can("settings:edit"), incidentResponseController.show);
router.post("/admin/incident-response/kill-user", can("settings:edit"), doubleCsrfProtection, incidentResponseController.killUser);
router.post("/admin/incident-response/kill-all", can("settings:edit"), doubleCsrfProtection, incidentResponseController.killAll);

module.exports = router;
