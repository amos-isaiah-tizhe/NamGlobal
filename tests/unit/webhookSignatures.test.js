const crypto = require("crypto");

describe("Paystack webhook signature verification", () => {
  beforeAll(() => {
    process.env.PAYSTACK_SECRET_KEY = "sk_test_fake_secret_key_12345";
  });

  test("a validly-signed request is accepted", () => {
    const { verifyWebhookSignature } = require("../../services/payments/paystackAdapter");
    const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "NG-1" } }));
    const validSig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
    expect(verifyWebhookSignature(rawBody, validSig)).toBe(true);
  });

  test("a tampered signature is rejected", () => {
    const { verifyWebhookSignature } = require("../../services/payments/paystackAdapter");
    const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "NG-1" } }));
    const validSig = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
    const tampered = "deadbeef" + validSig.slice(8);
    expect(verifyWebhookSignature(rawBody, tampered)).toBe(false);
  });

  test("a signature valid for a DIFFERENT body is rejected", () => {
    const { verifyWebhookSignature } = require("../../services/payments/paystackAdapter");
    const rawBody = Buffer.from(JSON.stringify({ event: "charge.success", data: { reference: "NG-1" } }));
    const sigForDifferentBody = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(Buffer.from("{}")).digest("hex");
    expect(verifyWebhookSignature(rawBody, sigForDifferentBody)).toBe(false);
  });

  test("a missing signature is rejected, not treated as valid", () => {
    const { verifyWebhookSignature } = require("../../services/payments/paystackAdapter");
    const rawBody = Buffer.from(JSON.stringify({ event: "charge.success" }));
    expect(verifyWebhookSignature(rawBody, undefined)).toBe(false);
  });
});

describe("Flutterwave webhook signature verification", () => {
  beforeAll(() => {
    process.env.FLUTTERWAVE_WEBHOOK_SECRET = "my-configured-secret-hash";
  });

  test("the correct verif-hash is accepted", () => {
    const { verifyWebhookSignature } = require("../../services/payments/flutterwaveAdapter");
    expect(verifyWebhookSignature(null, "my-configured-secret-hash")).toBe(true);
  });

  test("an incorrect verif-hash is rejected", () => {
    const { verifyWebhookSignature } = require("../../services/payments/flutterwaveAdapter");
    expect(verifyWebhookSignature(null, "wrong-hash")).toBe(false);
  });

  test("a missing verif-hash header is rejected", () => {
    const { verifyWebhookSignature } = require("../../services/payments/flutterwaveAdapter");
    expect(verifyWebhookSignature(null, undefined)).toBe(false);
  });
});

describe("Stripe webhook signature verification", () => {
  let stripe;

  beforeAll(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_fake_secret";
    const Stripe = require("stripe");
    stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  });

  test("a validly-signed payment.succeeded event is accepted and parses correctly", () => {
    const { constructWebhookEvent, parseWebhookEvent } = require("../../services/payments/stripeAdapter");

    const payload = JSON.stringify({
      id: "evt_test",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_123", metadata: { orderNumber: "NG-000123" }, payment_intent: "pi_test_456" } },
    });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });

    const event = constructWebhookEvent(payload, header);
    const parsed = parseWebhookEvent(event);

    expect(parsed.type).toBe("payment.succeeded");
    expect(parsed.orderNumber).toBe("NG-000123");
    expect(parsed.providerReference).toBe("cs_test_123");
  });

  test("an invalid signature is rejected (throws)", () => {
    const { constructWebhookEvent } = require("../../services/payments/stripeAdapter");
    const payload = JSON.stringify({ id: "evt_test", type: "checkout.session.completed", data: { object: {} } });

    expect(() => constructWebhookEvent(payload, "garbage-signature")).toThrow();
  });

  test("a dispute.created event parses into the correct normalized shape", () => {
    const { parseWebhookEvent } = require("../../services/payments/stripeAdapter");
    const disputeEvent = { type: "charge.dispute.created", data: { object: { id: "dp_test_1", payment_intent: "pi_test_456" } } };

    const parsed = parseWebhookEvent(disputeEvent);
    expect(parsed.type).toBe("dispute.created");
    expect(parsed.disputeReference).toBe("dp_test_1");
  });
});
