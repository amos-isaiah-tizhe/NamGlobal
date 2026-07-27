const DOMPurify = require("isomorphic-dompurify");

/**
 * Strips all HTML/script content from user-submitted text (reviews, support
 * tickets, contact messages, profile fields). Section 2.7 requires this in
 * addition to EJS's automatic output-escaping (`<%= %>`), since sanitizing
 * at write-time also protects any future consumer of the stored value (API
 * responses, admin exports, emails) that might not escape on output.
 */
function stripHtml(input) {
  if (typeof input !== "string") return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

module.exports = { stripHtml };
