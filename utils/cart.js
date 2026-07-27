/**
 * The session cart intentionally stores nothing but identifiers and
 * quantities — no price, no product name. Every price shown to the user
 * (cart page) or charged (checkout) is fetched fresh from the database via
 * services/cartService.js. This is what makes "never trust client-supplied
 * prices" (Section 2.7) true by construction rather than by remembering to
 * re-check it in every handler.
 */

function getCartItems(req) {
  return req.session.cart || [];
}

function addItem(req, productId, quantity = 1, variant = null) {
  const cart = getCartItems(req);
  const existing = cart.find((item) => item.productId === productId && item.variant === variant);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity, variant });
  }

  req.session.cart = cart;
  return cart;
}

function updateQuantity(req, productId, quantity, variant = null) {
  const cart = getCartItems(req);
  const item = cart.find((i) => i.productId === productId && i.variant === variant);
  if (item) {
    item.quantity = Math.max(1, quantity);
  }
  req.session.cart = cart;
  return cart;
}

function removeItem(req, productId, variant = null) {
  const cart = getCartItems(req).filter((i) => !(i.productId === productId && i.variant === variant));
  req.session.cart = cart;
  return cart;
}

function clearCart(req) {
  req.session.cart = [];
}

module.exports = { getCartItems, addItem, updateQuantity, removeItem, clearCart };
