const Category = require("../models/Category");

function listActive() {
  return Category.find({ isActive: true }).sort({ name: 1 });
}

function getBySlug(slug) {
  return Category.findOne({ slug, isActive: true });
}

module.exports = { listActive, getBySlug };
