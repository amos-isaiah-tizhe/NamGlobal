# Nam Global — Complete Environment Setup Guide

Step-by-step instructions to get **every** environment variable in `.env.example`
filled in and the app running, in the order that makes sense (some steps need
values from earlier ones). This covers **local development**. For deploying
to Render/production specifically, see [DEPLOYMENT.md](./DEPLOYMENT.md) —
this guide focuses on getting each account/credential set up in the first place.

---

## 0. Before you start

```bash
git clone <your-repo-url>
cd nam-global
npm install
cp .env.example .env
```

You'll edit `.env` as you go through this guide. Every section below tells you
exactly which line(s) in `.env` it fills in.

---

## 1. Runtime basics (no account needed)

These are already correct in `.env.example` for local development — just leave them:

```dotenv
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
```

---

## 2. Brand identity, contact, address, developer attribution

Already filled in correctly from the brand brief — nothing to do here unless
something changes (new phone number, new email, etc.):

```dotenv
SITE_NAME=Nam Global
SITE_TAGLINE=Home of Quality Phones, Gadgets
SITE_URL=https://namsglobal.com
CONTACT_PHONE=...
WHATSAPP_NUMBER=...
SUPPORT_PHONE=...
ALT_PHONE=...
CONTACT_EMAIL=...
SUPPORT_EMAIL=...
SALES_EMAIL=...
ORDERS_EMAIL=...
RETURNS_EMAIL=...
ADDRESS_LINE_1=...
ADDRESS_LINE_2=...
CITY=...
STATE=...
COUNTRY=...
POSTAL_CODE=...
DEVELOPER_NAME=...
DEVELOPER_BRAND=...
DEVELOPER_URL=...
BRAND_URL=...
```

**⚠️ Before going live:** change `ADMIN_DEFAULT_PASSWORD` from the value in
`.env.example` — that's a development seed value, never a real credential.
Generate a strong password and update these four:

```dotenv
ADMIN_DEFAULT_NAME=
ADMIN_DEFAULT_USERNAME=
ADMIN_DEFAULT_EMAIL=
ADMIN_DEFAULT_PASSWORD=
```

---

## 3. MongoDB (required — the app won't boot without this)

**Local option (fastest for development):**
1. Install MongoDB Community Edition, or run it via Docker: `docker run -d -p 27017:27017 mongo:7`
2. Set:
   ```dotenv
   MONGODB_URI=mongodb://localhost:27017/nam_global
   ```

**Cloud option (MongoDB Atlas free tier — needed for production either way):**
1. Create an account at [mongodb.com/atlas](https://mongodb.com/atlas), create a free **M0** cluster.
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add your current IP (or `0.0.0.0/0` for now, tighten later).
4. **Connect → Drivers** → copy the connection string, replace `<password>`, add a database name:
   ```dotenv
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nam_global?retryWrites=true&w=majority
   ```

---

## 4. Session secret (required — generate this yourself, no account needed)

```bash
openssl rand -hex 32
```

Copy the output into:

```dotenv
SESSION_SECRET=<paste the generated value>
```

Never reuse this across environments (dev/staging/production each get their own).

---

## 5. Redis (required for sessions/caching — or leave blank to fall back to MongoDB)

**Local option:**
1. Install Redis, or run via Docker: `docker run -d -p 6379:6379 redis:7-alpine`
2. Set:
   ```dotenv
   REDIS_URL=redis://localhost:6379
   ```

**Cloud option (Upstash free tier):**
1. Create an account at [upstash.com](https://upstash.com), create a free Redis database.
2. Copy the **Redis URL** (starts with `rediss://`) from the dashboard.
3. Set `REDIS_URL` to that value.

**If you leave `REDIS_URL` blank**, the app automatically falls back to storing
sessions in MongoDB instead (via `connect-mongo`) — it will still work, just
without the caching/background-job features that need Redis specifically
(BullMQ, the homepage/category cache). Fine for a very first test run; set
Redis up properly before relying on those features.

---

## 6. Cloudinary (image hosting)

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. On your dashboard, copy the three values shown near the top:
   ```dotenv
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

---

## 7. Resend (transactional email)

1. Create a free account at [resend.com](https://resend.com).
2. **API Keys** → create a new key → copy it:
   ```dotenv
   RESEND_API_KEY=
   ```
3. (For production only) **Domains** → add `namsglobal.com` → add the DNS
   records Resend gives you to your domain's DNS provider, to send from a
   `@namsglobal.com` address instead of Resend's test domain.

---

## 8. Payment providers (all optional — WhatsApp checkout works with none of these set)

Set up whichever you actually want to accept. Each needs both a secret key
and a webhook secret; a provider is only offered at checkout if its keys are
set **and** it's toggled on in **Admin → Site Settings**.

### Stripe
1. Create an account at [stripe.com](https://stripe.com), stay in **test mode** for now (toggle top-right).
2. **Developers → API keys** → copy the **Secret key**:
   ```dotenv
   STRIPE_SECRET_KEY=sk_test_...
   ```
3. **Developers → Webhooks** → add an endpoint. For local testing, use the
   [Stripe CLI](https://stripe.com/docs/stripe-cli) instead of a real endpoint:
   ```bash
   stripe listen --forward-to localhost:3000/webhooks/stripe
   ```
   This prints a webhook signing secret starting with `whsec_` — use that:
   ```dotenv
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Paystack
1. Create an account at [paystack.com](https://paystack.com), stay in test mode.
2. **Settings → API Keys & Webhooks** → copy the **Secret Key**:
   ```dotenv
   PAYSTACK_SECRET_KEY=sk_test_...
   ```
3. Same page → set your webhook URL to `https://<your-domain>/webhooks/paystack`
   (for local testing, use a tunnel tool like `ngrok http 3000` to get a public
   URL first, then point Paystack at `https://<ngrok-url>/webhooks/paystack`).
   Paystack signs webhooks with your **Secret Key** itself rather than issuing
   a separate signing secret — check Paystack's current docs to confirm, then:
   ```dotenv
   PAYSTACK_WEBHOOK_SECRET=<per Paystack's current documentation>
   ```

### Flutterwave
1. Create an account at [flutterwave.com](https://flutterwave.com), stay in test mode.
2. **Settings → API** → copy the **Secret Key**:
   ```dotenv
   FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
   ```
3. **Settings → Webhooks** → set the URL to `https://<your-domain>/webhooks/flutterwave`
   and set a **secret hash** (you choose this value yourself):
   ```dotenv
   FLUTTERWAVE_WEBHOOK_SECRET=<the secret hash you set in the Flutterwave dashboard>
   ```

---

## 9. TOTP issuer name (no account needed — just a label)

This is the name shown inside an admin's authenticator app (Google
Authenticator, Authy, etc.) next to their 2FA code. Already set correctly:

```dotenv
TOTP_ISSUER_NAME=Nam Global
```

Nothing to sign up for — this is self-hosted 2FA (the `speakeasy` library),
not a third-party service.

---

## 10. Sentry (optional — error tracking)

Completely optional; the app runs fine with this blank.

1. Create a free account at [sentry.io](https://sentry.io).
2. Create a new project (platform: Node.js/Express).
3. Copy the **DSN** shown during setup:
   ```dotenv
   SENTRY_DSN=https://...@...ingest.sentry.io/...
   ```

Leave it blank to skip error tracking entirely — nothing else changes.

---

## 11. Log level (no account needed — just a setting)

Optional. Controls how verbose the console/log output is.

```dotenv
LOG_LEVEL=debug
```

Valid values: `debug`, `info`, `warn`, `error`. Leave blank and it defaults
sensibly (`debug` in development, `info` in production).

---

## 12. CAPTCHA — ⚠️ not actually wired up yet, skip this

```dotenv
CAPTCHA_SITE_KEY=
CAPTCHA_SECRET_KEY=
```

Being upfront: these two variables exist in `.env.example` as a placeholder
for the CAPTCHA/bot-mitigation requirement in the original spec (Section
2.7), but **no code in this codebase actually calls Turnstile, hCaptcha, or
reCAPTCHA anywhere yet** — checked directly, there's no reference to any of
those in the source. Setting these two values right now would do nothing.
If you want this wired up for real (recommended before high-traffic launch,
per the original spec), that's a follow-up task: add Cloudflare Turnstile
(free) to the login/register/contact forms and verify the token
server-side. Until then, leave these blank.

---

## 13. Google OAuth (customer-facing "Continue with Google")

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or use an existing one) — top-left project dropdown → **New Project**.
3. **APIs & Services → OAuth consent screen** → choose **External**, fill in
   the basic app info (app name "Nam Global", your support email), save.
4. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Under **Authorized redirect URIs**, add:
   - For local dev: `http://localhost:3000/auth/google/callback`
   - For production: `https://namsglobal.com/auth/google/callback`
7. Click Create — copy the **Client ID** and **Client Secret**:
   ```dotenv
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   ```
   (Switch `GOOGLE_CALLBACK_URL` to the `https://namsglobal.com/...` version
   in your production environment variables — it must exactly match one of
   the redirect URIs you added in step 6.)

If you leave all three Google variables blank, "Continue with Google" simply
doesn't appear/work — the rest of the app is unaffected.

---

## 14. GitHub OAuth (internal developer tooling only — not the customer storefront)

Only set this up if/when you build internal tooling that needs it (an ops
dashboard, docs portal, etc. — see Section 2.7b). Skip for a normal launch.

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
   (or for an organization: **Org Settings → Developer settings → OAuth Apps**).
2. **Homepage URL**: `https://namsglobal.com`
3. **Authorization callback URL**:
   - Local dev: `http://localhost:3000/internal/auth/github/callback`
   - Production: `https://namsglobal.com/internal/auth/github/callback`
4. Register the app — copy the **Client ID**, then generate and copy a **Client Secret**:
   ```dotenv
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   GITHUB_CALLBACK_URL=http://localhost:3000/internal/auth/github/callback
   ```
5. If you want to restrict login to members of your GitHub organization
   (recommended — otherwise any GitHub account can authenticate):
   ```dotenv
   GITHUB_ALLOWED_ORG=your-github-org-name
   ```
   Leave blank to allow any GitHub account (not recommended beyond quick local testing).

---

## 15. Put it all together

Once you've worked through the sections above relevant to you (MongoDB,
session secret, and Redis are the only truly required ones — everything
else can be added later), run:

```bash
npm run migrate:up    # creates database indexes
npm run seed            # seeds categories, sample products, the admin account
npm run dev
```

Visit `http://localhost:3000`.

---

## 16. Verify it's actually working

```bash
curl http://localhost:3000/health
# {"status":"ok"}

curl http://localhost:3000/ready
# {"status":"ready","checks":{"mongodb":true,"redis":true}}
# (redis will be false here if you skipped Section 5 — that's expected, not an error)
```

Log in at `http://localhost:3000/login` with the `ADMIN_DEFAULT_EMAIL` /
`ADMIN_DEFAULT_PASSWORD` from Section 2 — you'll be prompted to set up 2FA
immediately, since admin accounts require it.

---

## Quick reference: what's required vs optional

| Variable group | Required to boot? | What breaks if left blank |
|---|---|---|
| MongoDB | **Yes** | App refuses to start |
| Session secret | **Yes** | App refuses to start |
| Redis | No (falls back to MongoDB) | No Redis caching/BullMQ jobs, still works |
| Cloudinary | No | Product images fall back to local seed paths |
| Resend | No | Order-confirmation emails silently no-op (logged, not sent) |
| Stripe/Paystack/Flutterwave | No | That provider just doesn't appear at checkout; WhatsApp checkout always works |
| TOTP issuer name | No | Just a cosmetic label in authenticator apps |
| Sentry | No | No error tracking, everything else unaffected |
| Log level | No | Defaults sensibly |
| CAPTCHA keys | N/A | Not wired to any code yet regardless — see Section 12 |
| Google OAuth | No | "Continue with Google" doesn't appear |
| GitHub OAuth | No | Only needed for internal tooling, not the storefront |
