/**
 * Computes pagination metadata from a page/limit/total triple. Kept as a
 * pure function so it's testable without a database connection, and reused
 * by every list endpoint (category listing, search results, admin tables
 * in later stages) so the shape is always consistent.
 */
function buildPagination(page, limit, totalCount) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100); // hard ceiling — never unbounded (Section 2.17)
  const totalPages = Math.max(1, Math.ceil(totalCount / safeLimit));
  const currentPage = Math.min(safePage, totalPages);
  const skip = (currentPage - 1) * safeLimit;

  return {
    page: currentPage,
    limit: safeLimit,
    skip,
    totalCount,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

module.exports = { buildPagination };
