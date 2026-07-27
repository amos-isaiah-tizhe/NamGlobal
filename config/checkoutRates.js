/**
 * Placeholder shipping/tax rates. Section 1.5 lists delivery coverage but no
 * fee table, so this is a reasonable flat-rate default — Stage 8's admin
 * dashboard (Site Settings) is the natural place to make these DB-driven
 * and editable without a code change.
 */

const VAT_RATE = 0.075; // Nigeria standard VAT

const SHIPPING_FEES_BY_STATE = {
  Nasarawa: 1500,
  FCT: 2000, // Abuja
  Lagos: 3500,
  Kano: 4000,
  Rivers: 4000, // Port Harcourt
  Enugu: 3500,
  Kaduna: 3000,
  Plateau: 2500, // Jos
};

const DEFAULT_SHIPPING_FEE = 4500; // any state not listed above

function getShippingFee(state) {
  return SHIPPING_FEES_BY_STATE[state] ?? DEFAULT_SHIPPING_FEE;
}

function getTax(subtotal) {
  return Math.round(subtotal * VAT_RATE);
}

module.exports = { VAT_RATE, getShippingFee, getTax };
