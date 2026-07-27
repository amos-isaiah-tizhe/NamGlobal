const { buildPagination } = require("../../utils/pagination");

describe("buildPagination", () => {
  test("computes correct pages/skip for a normal case", () => {
    const result = buildPagination(1, 20, 45);
    expect(result).toMatchObject({ page: 1, limit: 20, skip: 0, totalPages: 3, hasNextPage: true, hasPrevPage: false });
  });

  test("last page has hasNextPage false", () => {
    const result = buildPagination(3, 20, 45);
    expect(result).toMatchObject({ page: 3, skip: 40, hasNextPage: false, hasPrevPage: true });
  });

  test("clamps an out-of-range page to the last valid page", () => {
    const result = buildPagination(99, 20, 45);
    expect(result.page).toBe(3);
  });

  test("clamps limit to a hard ceiling of 100 (Section 2.17 — never unbounded)", () => {
    const result = buildPagination(1, 500, 45);
    expect(result.limit).toBe(100);
  });

  test("handles zero results without dividing by zero", () => {
    const result = buildPagination(1, 20, 0);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  test("non-numeric page/limit fall back to safe defaults", () => {
    const result = buildPagination("not-a-number", "also-not-a-number", 10);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});
