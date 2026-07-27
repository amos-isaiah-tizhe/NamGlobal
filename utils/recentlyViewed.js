const MAX_RECENTLY_VIEWED = 10;

function trackView(req, productId) {
  const id = productId.toString();
  const list = (req.session.recentlyViewed || []).filter((existingId) => existingId !== id);
  list.unshift(id);
  req.session.recentlyViewed = list.slice(0, MAX_RECENTLY_VIEWED);
}

function getRecentlyViewedIds(req, excludeId = null) {
  const list = req.session.recentlyViewed || [];
  return excludeId ? list.filter((id) => id !== excludeId.toString()) : list;
}

module.exports = { trackView, getRecentlyViewedIds, MAX_RECENTLY_VIEWED };
