/**
 * Basic load test — Section 2.19: "Run at least a basic load/stress test
 * against the checkout and product-listing endpoints before the first real
 * launch, to catch obvious bottlenecks (missing indexes, N+1 queries)
 * while traffic is still low-stakes."
 *
 * Run against a REAL running instance with seeded data:
 *   npm run dev              (in one terminal)
 *   node scripts/loadtest.js (in another)
 *
 * Not run automatically in CI — this is a manual pre-launch check, not a
 * correctness test. Requires `npm install` to have pulled in `autocannon`
 * (devDependency) and a live server at BASE_URL with seeded categories/products.
 */

const autocannon = require("autocannon");

const BASE_URL = process.env.LOADTEST_BASE_URL || "http://localhost:3000";
const DURATION_SECONDS = 15;
const CONNECTIONS = 20;

async function run(name, opts) {
  console.log(`\n--- ${name} ---`);
  const result = await autocannon({
    url: BASE_URL,
    connections: CONNECTIONS,
    duration: DURATION_SECONDS,
    ...opts,
  });
  console.log(autocannon.printResult(result));
  return result;
}

(async () => {
  // Homepage — Section 2.17's Redis-cached homepage sections should keep
  // this fast even under load; a slow result here points at a cache miss
  // storm or a missing index on one of the homepage queries.
  await run("Homepage (GET /)", { requests: [{ method: "GET", path: "/" }] });

  // Category listing — the single highest-traffic DB-querying page
  // (filter/sort/paginate). Swap "smartphones" for a real seeded category
  // slug if different.
  await run("Category listing (GET /category/smartphones)", {
    requests: [{ method: "GET", path: "/category/smartphones" }],
  });

  // Health endpoint — should be trivially fast; if this is slow, the
  // problem is upstream of the app itself (network/proxy), not the app.
  await run("Health check (GET /health)", { requests: [{ method: "GET", path: "/health" }] });

  console.log(
    "\nCheckout itself isn't load-tested here directly since it needs a real " +
      "session, CSRF token, and cart contents per request (a raw connection-flood " +
      "would just hit 400s, not exercise the checkout code path meaningfully). " +
      "For a realistic checkout load test, script a full add-to-cart -> checkout " +
      "flow per virtual user with a tool like k6, seeded with test product data."
  );
})();
