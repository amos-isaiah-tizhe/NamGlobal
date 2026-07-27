# Nam Global

Full-stack e-commerce platform for Nam Global — a Nigerian consumer
electronics business dealing in phones, laptops, gaming consoles, and
gadgets, with buy/sell/swap (**iSELL** / **iBUY** / **iSWAP**) as core
services. Built with Node.js, Express, EJS, MongoDB, and Redis.

Live at: **https://namsglobal.com** (once deployed — see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## Post-delivery fixes

Real bugs found after handoff, running the app for the first time outside
the original build environment:

- **`connect-mongo` v6 CJS import fix** — `config/session.js` was calling
  `MongoStore.create()` on the wrong import shape (`connect-mongo` v6 uses a
  named export, `const { MongoStore } = require("connect-mongo")`, not a
  default export). Fixed.
- **Caching didn't degrade gracefully without Redis** — despite the docs
  saying `REDIS_URL` is optional, `config/cache.js` (used on every homepage/
  category/product page) had no fallback: with no Redis configured, it tried
  to connect to a guessed default address, retried indefinitely, and
  eventually threw — a hard 500 on the entire storefront. Fixed in
  `config/redisClient.js` (never guesses a connection when `REDIS_URL` isn't
  set; bounded reconnect attempts; logs a connection error once, not on
  every retry) and `config/cache.js` (every cache operation now falls back
  to "just run the query, skip caching" on any Redis failure). Verified live
  both ways — with Redis absent (near-instant, no error) and present
  (genuinely still caches, no regression) — and locked in with a regression
  test (`tests/integration/cache.test.js`).

---

## Features

**Storefront**
- Homepage with hero, category browsing, flash sales/featured/new-arrival/
  trending/bestseller product rows, FAQ, newsletter signup
- Category pages with filtering, sorting, in-category search, pagination
- Product detail pages with specs, reviews, related products, recently-viewed,
  wishlist
- Site-wide search with autocomplete (`GET /api/v1/search/suggest`)

**Cart, checkout & payments**
- Session cart with prices always re-fetched server-side (never trusts a
  client-supplied price)
- Coupons, tax, and shipping calculation
- Guest and logged-in checkout
- **WhatsApp checkout** — creates a real order before handing off to WhatsApp,
  never auto-confirmed
- Stripe, Paystack, and Flutterwave integration with verified webhooks —
  orders only become "paid" via a signed webhook, never a client redirect
- Dispute/chargeback handling and an admin refund flow with segregation-of-
  duties enforcement on high-value refunds

**Accounts & security**
- Email/password auth (bcrypt, complexity rules, breached-password check,
  account lockout with exponential backoff) and Google/GitHub OAuth
- Mandatory TOTP 2FA for admin/staff roles
- Granular, permission-based RBAC (five roles, checked by permission name
  not role string)
- Helmet/CSP (with a per-request nonce for JSON-LD structured data), CSRF,
  rate limiting, NoSQL-injection and HTTP-parameter-pollution guards,
  server-side input sanitization
- A tested session kill-switch (per-account and site-wide) for incident response

**Dashboards**
- User dashboard: orders, profile, password, saved addresses, wishlist,
  support tickets
- Admin dashboard (isolated route/rate-limit surface): products, categories,
  orders (with refund/dispute handling), coupons, users & roles, audit log,
  site settings (payment-provider toggles, maintenance mode), support tickets,
  incident response tools

**SEO, GEO & accessibility**
- `robots.txt` (with an explicit AI-crawler allowlist), `llms.txt`, dynamic
  `sitemap.xml`, canonical URLs, OpenGraph/Twitter Card tags
- JSON-LD structured data: Organization, Product, BreadcrumbList, FAQPage
- Skip-to-content link, visible focus states, ARIA labels, `prefers-reduced-motion`

**Infrastructure**
- Redis-backed caching (homepage/category/product reads) with version-based
  invalidation
- BullMQ background jobs (order-confirmation email wired end-to-end)
- `/health` and `/ready` endpoints, graceful shutdown, structured logging with
  per-request correlation IDs, optional Sentry hook
- Docker + docker-compose for local dev; deploys to Render via `render.yaml`
- Automated daily encrypted database backups (GitHub Actions)

**Compliance**
- Privacy Policy, Terms of Service, and Cookie Policy with real, tailored
  content (not boilerplate)
- Data-subject-request workflow (access/correction/deletion, 30-day deadline)
- Incident response plan with a credential-rotation runbook — see
  [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)

---

## What's deliberately not built (and why)

Rather than leave gaps silent, here's what the master spec names that isn't
in this codebase yet, and why:

| Not built | Reason |
|---|---|
| Homepage Builder, SEO Manager, Media Manager (admin content-authoring tools) | Products/categories are already fully editable; these are visual-authoring layers on top of what exists, not new capability |
| PDF invoice generation, image-processing jobs, inventory sync, abandoned-cart reminder jobs | Named in Section 2.17 as background-job candidates, but each needs a feature that doesn't exist yet (uploads) or a product decision that hasn't been made ("what counts as abandoned?") — the queue infrastructure they'd use is already built and proven with one real job (order-confirmation email) |
| Automated enforcement of the stated data-retention periods | The retention *policy* is defined and disclosed (Privacy Policy) per Section 2.7a's requirement; a scheduled job to actually clear old carts/anonymize old tickets isn't built yet |
| AI-crawler-traffic analytics reporting | Needs an analytics layer that doesn't exist yet |
| A live Lighthouse/securityheaders.com pass | Needs an actual deployed URL and a real browser — not possible before deployment. See "Launch checklist" below for exactly how to run these once `namsglobal.com` is live |

---

## Installation

```bash
npm install
cp .env.example .env      # fill in your local MongoDB/Redis/etc.
npm run migrate:up        # create indexes
npm run seed               # dev/demo data — refuses to run if NODE_ENV=production
npm run dev
```

Visit `http://localhost:3000`.

**New to this project or setting it up for the first time?** See
**[SETUP_GUIDE.md](./SETUP_GUIDE.md)** for a complete walkthrough of every
single environment variable — which ones are required vs optional, and
exact step-by-step instructions for creating each account (MongoDB Atlas,
Upstash, Cloudinary, Resend, Stripe/Paystack/Flutterwave, Google/GitHub
OAuth, Sentry).

## Environment variables

See `.env.example` for the full list (brand/contact/address values from
Section 1, plus technical config). Notes:
- `MONGODB_URI` is required to boot at all — the app fails fast with a clear
  error if it's unset or unreachable, rather than hanging.
- Sessions need either `REDIS_URL` (primary) or `MONGODB_URI` (fallback via
  `connect-mongo`) — never in-memory storage, in any environment.
- Google/GitHub OAuth are optional: their strategies only register if the
  corresponding client ID/secret env vars are set.
- Payment providers (Stripe/Paystack/Flutterwave) are each optional
  independently — only offered at checkout if both their keys are set *and*
  they're toggled on in Admin > Site Settings.

## Folder structure

```
config/          env loader, siteConfig, database/redis/cache/queue/logger/sentry
controllers/     route handlers, including controllers/admin/ for the admin dashboard
middleware/      auth, security (helmet/CSP), rate limiters, CSRF, request logging
models/          Mongoose schemas (Product, Order, User, etc.)
migrations/      versioned migrate-mongo migrations
routes/          Express routers, one per feature area
services/        business logic (payments/, cart, coupons, caching, session kill-switch)
utils/           pure helper functions (pagination, slugs, WhatsApp messages, etc.)
validators/       express-validator chains
views/           EJS templates — views/admin/, views/account/, views/legal/
public/          static assets — css/, js/, images/branding/, robots.txt, llms.txt
seed/            dev/demo data seed scripts (production-gated)
tests/           Jest test suite — tests/unit/, tests/integration/, tests/helpers/
scripts/         one-off scripts (scripts/loadtest.js)
.github/workflows/  CI (test/lint/audit) and a scheduled encrypted DB backup
```

## Development workflow

```bash
npm run dev             # nodemon, auto-restarts on file changes
npm run worker:dev       # the BullMQ worker, separately, if testing background jobs
npm test                 # full Jest suite
npm run test:unit         # no database needed
npm run loadtest          # basic load test against a running instance
```

Migrations are never run automatically on boot — run `npm run migrate:up`
explicitly as a deploy step (this is also how Render's build command is
configured; see `render.yaml`).

## Testing

```bash
cp .env.test.example .env.test   # point at a disposable test MongoDB/Redis
npm test                          # full suite
npm run test:unit                 # pure logic + Mongoose schema validation, no DB needed
npm run test:integration          # needs MONGODB_URI + REDIS_URL in .env.test
npm run test:coverage             # with the Section 2.19 coverage thresholds
```

CI (`.github/workflows/ci.yml`) provisions real MongoDB + Redis service
containers and runs the full suite, including the integration tests that
need a live database, on every pull request.

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete walkthrough:
MongoDB Atlas, Upstash Redis, Cloudinary, Resend, payment-provider webhook
setup, the Render Blueprint deploy (`render.yaml`), Cloudflare DNS/WAF/Access,
backups, and a post-deploy checklist. Every free-tier service is swappable
for a paid equivalent via environment variables only — see DEPLOYMENT.md's
"Upgrading off the free tier later" table.

## Security & incident response

Security controls are layered throughout: Helmet/CSP with per-request
nonces, CSRF, tiered rate limiting, NoSQL-injection/HPP guards, mandatory
admin 2FA, granular RBAC, encrypted backups, and a live-tested session
kill-switch. See **[INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)** for
severity levels, the kill-switch's admin UI, a step-by-step credential-
rotation runbook, and the PCI DSS SAQ-A scope note (card data never touches
this application — it's handled entirely by the payment providers' hosted
checkout pages).

## Launch checklist

Before considering this launched for real:

- [ ] Run through [DEPLOYMENT.md](./DEPLOYMENT.md)'s post-deploy checklist
- [ ] Run a real Lighthouse audit against the live URL: `npx lighthouse https://namsglobal.com --view`
      (or Chrome DevTools > Lighthouse) — the static fundamentals (semantic
      HTML, alt text, lazy-loaded images, meta tags, CSP, canonical URLs) are
      already in place per the stage-by-stage build, but only a real browser
      against a real deployed URL gives real performance/accessibility/SEO scores
- [ ] Run the deployed site through [securityheaders.com](https://securityheaders.com)
      and the OWASP Top 10 checklist (Section 2.7's ongoing verification requirement)
- [ ] Walk through Section 1 of the original brand brief against the live
      site: brand name/tagline/colors, contact numbers and emails, address
      and hours, delivery coverage, social handles, warranty/return policy
      text, payment methods, developer attribution in the footer — everything
      in Section 1 should be traceable to a specific place in this codebase
      (mostly `config/siteConfig.js` reading from `.env`, plus the legal pages)
- [ ] Rotate the Section 1.10 seed admin password — it's a known development
      value, never a production credential
- [ ] Set up the GitHub Actions backup workflow's two repo secrets
      (`MONGODB_URI`, `BACKUP_ENCRYPTION_PASSPHRASE`) and do one manual
      test-restore before relying on it

## License

Proprietary — see [LICENSE](./LICENSE). This is a commercial deliverable for
Nam Global, not an open-source project. Third-party packages retain their
own licenses (see `package.json`).

## A note on how this was verified

This was built in an environment with no reachable MongoDB and no Docker
daemon, but with the ability to install and genuinely test against a real
local Redis instance. Wherever that was possible, things were tested live
rather than just reviewed — and it caught real bugs: a cache-invalidation
version counter that would have silently no-op'd on its first use (Stage 10),
a CSP nonce implementation that was wrong until tested against a real
Helmet instance (Stage 9), Mongoose validation hooks that broke outside the
one code path they'd always been exercised through before (Stage 13), and a
transitive ESM dependency that would have broken CI silently (Stage 13). The
full Jest suite's unit tests and Redis-backed integration tests (53 tests)
genuinely pass in this environment; the MongoDB-dependent integration tests
are written correctly and confirmed to fail with nothing but a connection
refusal here — they're designed to run for real in CI, where
`.github/workflows/ci.yml` provisions actual database service containers.

Stage 14's own job — walking Section 1 of the brand brief against the actual
codebase — also found two real gaps rather than confirming everything was
already fine: **business hours and social media handles (Section 1.4/1.6)
were nowhere in the codebase**, only ever implied. Both are now in
`config/siteConfig.js` and shown on the contact page and footer. Separately,
Section 1.8's full payment-method list (bank transfer, USSD, Moniepoint,
Opay, cash-at-store) wasn't explicitly surfaced at checkout, which only
showed the three gateway providers — added a clarifying note there rather
than build out-of-scope Moniepoint/Opay integrations (Section 2.2 specifies
Stripe/Paystack/Flutterwave only; bank transfer/USSD/card are already
available through Paystack/Flutterwave's own hosted checkout, and cash/
WhatsApp-confirmed payment already has a real path via WhatsApp checkout).

Before relying on this in production: run `npm run seed` against your real
MongoDB, push to GitHub and let CI run the full suite for real, try
`docker compose up` once, and work through the launch checklist above.
