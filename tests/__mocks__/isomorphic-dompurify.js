/**
 * Manual Jest mock for isomorphic-dompurify (Section 2.19).
 *
 * The real package pulls in jsdom -> html-encoding-sniffer -> whatwg-encoding
 * -> @exodus/bytes, which ships an ESM-only file Jest can't transform under
 * CommonJS by default — this breaks EVERY integration test that boots the
 * full app (server.js requires contactController -> sanitizeHtml ->
 * isomorphic-dompurify transitively), regardless of whether MongoDB is
 * reachable. Confirmed by running the real suite: three test *suites*
 * failed at module-load time with `SyntaxError: Unexpected token 'export'`,
 * not from any assertion failing.
 *
 * This mock provides the same behavior our utils/sanitizeHtml.js actually
 * relies on (strip all tags/attributes) without the ESM dependency chain.
 * The real DOMPurify library remains in production `node_modules` and is
 * what actually runs in the deployed app — only the test environment
 * substitutes this simplified version.
 */
function sanitize(input, options = {}) {
  if (typeof input !== "string") return input;
  if (options.ALLOWED_TAGS && options.ALLOWED_TAGS.length === 0) {
    return input.replace(/<[^>]*>/g, "");
  }
  return input;
}

module.exports = { sanitize };
