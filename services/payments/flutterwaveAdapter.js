const FLW_BASE_URL = "https://api.flutterwave.com/v3";

async function createCheckout(order, { redirectUrl, email, phone, name }) {
  const response = await fetch(`${FLW_BASE_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: order.orderNumber,
      amount: order.total,
      currency: "NGN",
      redirect_url: redirectUrl,
      customer: { email, phonenumber: phone, name },
      meta: { orderNumber: order.orderNumber },
    }),
  });

  const data = await response.json();
  if (data.status !== "success") throw new Error(data.message || "Flutterwave initialization failed");

  return { redirectUrl: data.data.link, providerReference: order.orderNumber };
}

/**
 * Section 2.7 — Flutterwave doesn't HMAC-sign webhooks; it sends a static
 * "verif-hash" header that must exactly match the secret hash configured in
 * the Flutterwave dashboard (stored here as FLUTTERWAVE_WEBHOOK_SECRET).
 * Still a reject-if-missing-or-mismatched check, same principle as the
 * HMAC-based providers.
 */
function verifyWebhookSignature(_rawBody, signatureHeader) {
  return !!signatureHeader && signatureHeader === process.env.FLUTTERWAVE_WEBHOOK_SECRET;
}

function parseWebhookEvent(event) {
  if (event.event === "charge.completed" && event.data?.status === "successful") {
    return {
      type: "payment.succeeded",
      orderNumber: event.data.tx_ref,
      providerReference: event.data.id?.toString(),
    };
  }
  if (event.event === "transfer.dispute" || event.event === "chargeback.completed") {
    return {
      type: "dispute.created",
      providerReference: event.data?.id?.toString(),
      disputeReference: event.data?.id?.toString(),
    };
  }
  return { type: "unhandled", raw: event.event };
}

async function refund(transactionId, amount) {
  const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(amount ? { amount } : {}),
  });

  const data = await response.json();
  return { success: data.status === "success", refundReference: data.data?.id?.toString() || null };
}

module.exports = { createCheckout, verifyWebhookSignature, parseWebhookEvent, refund };
