const crypto = require("crypto");

const PAYSTACK_BASE_URL = "https://api.paystack.co";

async function createCheckout(order, { callbackUrl, email }) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(order.total * 100), // kobo
      reference: order.orderNumber,
      callback_url: callbackUrl,
      metadata: { orderNumber: order.orderNumber },
    }),
  });

  const data = await response.json();
  if (!data.status) throw new Error(data.message || "Paystack initialization failed");

  return { redirectUrl: data.data.authorization_url, providerReference: data.data.reference };
}

/** Section 2.7 — verify the raw-body HMAC-SHA512 signature before trusting the payload. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const expected = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  return expected === signatureHeader;
}

function parseWebhookEvent(event) {
  if (event.event === "charge.success") {
    return {
      type: "payment.succeeded",
      orderNumber: event.data.reference,
      providerReference: event.data.reference,
    };
  }
  if (event.event === "charge.dispute.create" || event.event === "chargeback.create") {
    return {
      type: "dispute.created",
      providerReference: event.data.transaction_reference || event.data.reference,
      disputeReference: event.data.id?.toString(),
    };
  }
  return { type: "unhandled", raw: event.event };
}

async function refund(transactionReference, amount) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: transactionReference,
      amount: amount ? Math.round(amount * 100) : undefined,
    }),
  });

  const data = await response.json();
  return { success: !!data.status, refundReference: data.data?.id?.toString() || null };
}

module.exports = { createCheckout, verifyWebhookSignature, parseWebhookEvent, refund };
