const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");

router.get("/health", healthController.liveness);
router.get("/ready", healthController.readiness);

module.exports = router;
