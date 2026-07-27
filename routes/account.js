const express = require("express");
const router = express.Router();

const accountController = require("../controllers/accountController");
const { requireAuth } = require("../middleware/auth");
const { doubleCsrfProtection } = require("../middleware/csrf");

router.use("/account", requireAuth);

router.get("/account", accountController.showOverview);

router.get("/account/orders", accountController.listOrders);
router.get("/account/orders/:orderNumber", accountController.showOrder);

router.get("/account/profile", accountController.showProfile);
router.post("/account/profile", doubleCsrfProtection, accountController.updateProfile);
router.post("/account/password", doubleCsrfProtection, accountController.changePassword);

router.get("/account/addresses", accountController.listAddresses);
router.post("/account/addresses", doubleCsrfProtection, accountController.addAddress);
router.post("/account/addresses/:addressId/delete", doubleCsrfProtection, accountController.deleteAddress);

router.get("/account/wishlist", accountController.showWishlist);

router.get("/account/tickets", accountController.listTickets);
router.post("/account/tickets", doubleCsrfProtection, accountController.createTicket);
router.get("/account/tickets/:id", accountController.showTicket);

module.exports = router;
