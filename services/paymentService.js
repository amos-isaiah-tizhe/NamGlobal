const Order = require("../models/Order");
const AuditLog = require("../models/AuditLog");
const { isStripeEnabled, isPaystackEnabled, isFlutterwaveEnabled, getEnabledProviders } = require("../config/paymentProviders");

const stripeAdapter = require("./payments/stripeAdapter");
const paystackAdapter = require("./payments/paystackAdapter");
const flutterwaveAdapter = require("./payments/flutterwaveAdapter");

const ADAPTERS = { stripe: stripeAdapter, paystack: paystackAdapter, flutterwave: flutterwaveAdapter };
const ENABLED_CHECKS = { stripe: isStripeEnabled, paystack: isPaystackEnabled, flutterwave: isFlutterwaveEnabled };

// Section 2.7a — "Refunds above a configurable threshold should require the
// second-approval step already defined for high-impact actions." The admin
// UI to actually collect a second approver's confirmation is a Stage 8
// concern; this is the service-level gate it will sit in front of, so a
// refund can never be issued above this line by a single actor regardless
// of how the request got here.
const HIGH_VALUE_REFUND_THRESHOLD_NGN = 500000;

function getAdapter(provider) {
  const adapter = ADAPTERS[provider];
  if (!adapter || !ENABLED_CHECKS[provider]()) {
    throw new Error(`Payment provider "${provider}" is not available`);
  }
  return adapter;
}

async function initiatePayment(order, provider, options) {
  const adapter = getAdapter(provider);
  return adapter.createCheckout(order, options);
}

/**
 * Section 1.8 — combines Stage 7's "are the keys even configured" check
 * with the admin dashboard's on/off toggle (Stage 8). A provider must pass
 * both to be offered at checkout.
 */
async function getAvailableProviders() {
  const SiteSettings = require("../models/SiteSettings");
  const capable = getEnabledProviders();
  const settings = await SiteSettings.getSingleton();
  return capable.filter((provider) => settings.paymentProvidersEnabled[provider] !== false);
}

/**
 * Applies a normalized webhook event to the order. This is the ONLY path
 * that ever moves an order from "pending" to "paid" (Section 2.19 — never
 * from the client-side redirect). Deliberately does not read any amount
 * field off the webhook payload — the order's `total` was already fixed
 * server-side at checkout (Stage 6); the webhook only confirms *that*
 * payment succeeded for that reference, not *how much*.
 */
async function processPaymentEvent(parsedEvent) {
  if (parsedEvent.type === "payment.succeeded") {
    const order = await Order.findOne({ orderNumber: parsedEvent.orderNumber });
    if (!order) {
      console.warn("Webhook payment.succeeded for unknown order:", parsedEvent.orderNumber);
      return { handled: false };
    }
    if (order.status !== "pending") {
      // Already processed (webhook retry) or in a state that shouldn't be
      // silently overwritten — idempotent no-op rather than an error.
      return { handled: true, order, note: "Order was not in pending state; no change made" };
    }

    order.status = "paid";
    order.paymentReference = parsedEvent.providerReference || parsedEvent.paymentIntent || order.paymentReference;
    await order.save();

    // Section 2.17 — email sending happens off the webhook's request cycle;
    // if this enqueue fails for some reason, that's logged but doesn't fail
    // the webhook response (the provider would just retry the whole event).
    try {
      const { getEmailQueue } = require("../config/queues");
      const recipientEmail = order.user ? (await Order.populate(order, { path: "user", select: "email" })).user.email : order.guestEmail;
      await getEmailQueue().add("order-confirmation", {
        to: recipientEmail,
        orderNumber: order.orderNumber,
        total: order.total,
        items: order.items,
      });
    } catch (queueErr) {
      console.error("Failed to enqueue order-confirmation email:", queueErr.message);
    }

    return { handled: true, order };
  }

  if (parsedEvent.type === "dispute.created") {
    const order = await Order.findOne({ paymentReference: parsedEvent.providerReference });
    if (!order) {
      console.warn("Webhook dispute.created for unknown payment reference:", parsedEvent.providerReference);
      return { handled: false };
    }

    // Never resolve a dispute automatically — flag for admin review (Section 2.3).
    order.status = "disputed";
    order.disputeReference = parsedEvent.disputeReference;
    await order.save();

    await AuditLog.create({
      actor: order.user || null,
      action: "order.dispute_flagged",
      targetType: "Order",
      targetId: order._id,
      metadata: { disputeReference: parsedEvent.disputeReference, providerReference: parsedEvent.providerReference },
    }).catch((err) => console.error("Failed to write audit log for dispute:", err));

    return { handled: true, order };
  }

  return { handled: false, note: `Unhandled event type: ${parsedEvent.type}` };
}

/**
 * Section 2.3 Dispute & Refund Handling:
 *   - "must call the originating payment provider's refund API (not just
 *     change a database flag)"
 *   - "log which admin user issued it and why"
 *   - "Refunds above a configurable threshold should require the
 *     second-approval step"
 *   - "Store the provider's dispute/refund reference IDs on the order"
 *
 * @param {string} orderId
 * @param {object} params
 * @param {number} [params.amount] - partial refund amount; full refund if omitted
 * @param {string} params.reason - required, stored on the order and audit log
 * @param {string} params.actorUserId - the admin issuing the refund
 * @param {string} [params.approvedByUserId] - a second, distinct admin's ID —
 *   required when the refund amount is at/above HIGH_VALUE_REFUND_THRESHOLD_NGN
 */
async function issueRefund(orderId, { amount, reason, actorUserId, approvedByUserId } = {}) {
  if (!reason) throw new Error("A refund reason is required (Section 2.7 audit trail)");
  if (!actorUserId) throw new Error("issueRefund requires the acting admin's user ID");

  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");

  if (!["paid", "fulfilled", "refund_requested", "disputed"].includes(order.status)) {
    throw new Error(`Cannot refund an order in status "${order.status}"`);
  }
  if (!order.paymentProvider || order.paymentProvider === "manual") {
    throw new Error("This order has no gateway payment to refund (WhatsApp/manual order) — resolve it directly with the customer instead");
  }

  const refundAmount = amount || order.total;

  if (refundAmount >= HIGH_VALUE_REFUND_THRESHOLD_NGN) {
    if (!approvedByUserId) {
      throw new Error(
        `Refunds of ₦${HIGH_VALUE_REFUND_THRESHOLD_NGN.toLocaleString()} or more require a second admin's approval before they can be issued.`
      );
    }
    if (approvedByUserId === actorUserId) {
      throw new Error("The second approver must be a different admin than the one issuing the refund (segregation of duties).");
    }
  }

  const adapter = getAdapter(order.paymentProvider);
  const result = await adapter.refund(order.paymentReference, amount);

  if (!result.success) {
    throw new Error("The payment provider declined or failed to process this refund");
  }

  order.status = "refunded";
  order.refundReference = result.refundReference;
  order.refundReason = reason;
  order.refundIssuedBy = actorUserId;
  await order.save();

  await AuditLog.create({
    actor: actorUserId,
    action: "order.refund_issued",
    targetType: "Order",
    targetId: order._id,
    metadata: {
      amount: refundAmount,
      reason,
      refundReference: result.refundReference,
      approvedBy: approvedByUserId || null,
      provider: order.paymentProvider,
    },
  });

  return { success: true, order };
}

module.exports = { initiatePayment, processPaymentEvent, issueRefund, getAdapter, getAvailableProviders, HIGH_VALUE_REFUND_THRESHOLD_NGN };
