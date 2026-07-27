const Stripe = require("stripe");

let stripeClient = null;
function getClient() {
  if (!stripeClient) stripeClient = Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

/**
 * Creates a Stripe Checkout Session. Amounts are in kobo/cents-equivalent —
 * Stripe expects the smallest currency unit, so NGN amounts are multiplied
 * by 100. The line-item amount comes from the Order document (already
 * server-recomputed in Stage 6), never from anything in this request.
 */
async function createCheckout(order, { successUrl, cancelUrl }) {
  const stripe = getClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "ngn",
          product_data: { name: `Nam Global Order ${order.orderNumber}` },
          unit_amount: Math.round(order.total * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { orderNumber: order.orderNumber },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { redirectUrl: session.url, providerReference: session.id };
}

/**
 * Verifies the webhook signature against the RAW request body (Section 2.7 —
 * "verify webhook signatures... before trusting any webhook payload; reject
 * unsigned or mismatched requests"). Throws on failure — the caller (route
 * handler) is expected to catch and respond 400.
 */
function constructWebhookEvent(rawBody, signatureHeader) {
  const stripe = getClient();
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, process.env.STRIPE_WEBHOOK_SECRET);
}

/** Normalizes a Stripe event into the shape paymentService expects. */
function parseWebhookEvent(event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    return {
      type: "payment.succeeded",
      orderNumber: session.metadata?.orderNumber,
      providerReference: session.id,
      paymentIntent: session.payment_intent,
    };
  }
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    return {
      type: "dispute.created",
      providerReference: dispute.payment_intent,
      disputeReference: dispute.id,
    };
  }
  return { type: "unhandled", raw: event.type };
}

async function refund(paymentIntentId, amount) {
  const stripe = getClient();
  const refundObj = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined, // full refund if amount omitted
  });
  return { success: refundObj.status === "succeeded" || refundObj.status === "pending", refundReference: refundObj.id };
}

module.exports = { createCheckout, constructWebhookEvent, parseWebhookEvent, refund };
