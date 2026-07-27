/**
 * Section 1.8: "Admin should be able to enable/disable each payment
 * provider from the dashboard." The actual per-request DB toggle is a
 * Stage 8 (Admin Dashboard / Site Settings) feature; this stage provides
 * the underlying capability check it will sit on top of — a provider is
 * only ever usable if its keys are actually configured, dashboard toggle
 * or not.
 */
function isStripeEnabled() {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

function isPaystackEnabled() {
  return !!(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_WEBHOOK_SECRET);
}

function isFlutterwaveEnabled() {
  return !!(process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_WEBHOOK_SECRET);
}

function getEnabledProviders() {
  const providers = [];
  if (isStripeEnabled()) providers.push("stripe");
  if (isPaystackEnabled()) providers.push("paystack");
  if (isFlutterwaveEnabled()) providers.push("flutterwave");
  return providers;
}

module.exports = { isStripeEnabled, isPaystackEnabled, isFlutterwaveEnabled, getEnabledProviders };
