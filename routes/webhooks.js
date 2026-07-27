const express = require("express");
const router = express.Router();

const webhookController = require("../controllers/webhookController");

// express.raw() here, NOT express.json() — signature verification needs the
// exact raw bytes the provider signed, not a re-serialized JSON object.
// These must be mounted in server.js BEFORE the app-wide express.json()/
// urlencoded() middleware, or the raw body will already be consumed.
router.post("/webhooks/stripe", express.raw({ type: "application/json" }), webhookController.stripe);
router.post("/webhooks/paystack", express.raw({ type: "application/json" }), webhookController.paystack);
router.post("/webhooks/flutterwave", express.raw({ type: "application/json" }), webhookController.flutterwave);

module.exports = router;
