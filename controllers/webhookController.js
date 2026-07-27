const stripeAdapter = require("../services/payments/stripeAdapter");
const paystackAdapter = require("../services/payments/paystackAdapter");
const flutterwaveAdapter = require("../services/payments/flutterwaveAdapter");
const { processPaymentEvent } = require("../services/paymentService");

/**
 * Section 2.7/2.19: every handler verifies the signature against the RAW
 * body BEFORE parsing JSON or trusting anything in the payload. A
 * missing/invalid signature is always rejected with 400 — never processed
 * "just in case". Routes for these are mounted with express.raw() ahead of
 * the app's normal JSON body parser (see server.js) specifically so the
 * raw bytes are still available here for HMAC verification.
 */

exports.stripe = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripeAdapter.constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.warn("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send("Invalid signature");
  }

  const parsed = stripeAdapter.parseWebhookEvent(event);
  const result = await processPaymentEvent(parsed);
  res.status(200).json({ received: true, handled: result.handled });
};

exports.paystack = async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  if (!signature || !paystackAdapter.verifyWebhookSignature(req.body, signature)) {
    console.warn("Paystack webhook signature verification failed");
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString("utf8"));
  const parsed = paystackAdapter.parseWebhookEvent(event);
  const result = await processPaymentEvent(parsed);
  res.status(200).json({ received: true, handled: result.handled });
};

exports.flutterwave = async (req, res) => {
  const signature = req.headers["verif-hash"];

  if (!flutterwaveAdapter.verifyWebhookSignature(req.body, signature)) {
    console.warn("Flutterwave webhook signature verification failed");
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString("utf8"));
  const parsed = flutterwaveAdapter.parseWebhookEvent(event);
  const result = await processPaymentEvent(parsed);
  res.status(200).json({ received: true, handled: result.handled });
};
