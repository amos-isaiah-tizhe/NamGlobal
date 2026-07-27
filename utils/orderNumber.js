/**
 * Human-readable order numbers: NG-YYYYMMDD-XXXXX (random suffix).
 * Uniqueness is still enforced by the schema's unique index — this is just a
 * nice format, not the uniqueness guarantee itself.
 */
function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `NG-${datePart}-${randomPart}`;
}

module.exports = { generateOrderNumber };
