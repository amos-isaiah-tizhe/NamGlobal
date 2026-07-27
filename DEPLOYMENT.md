# Deploying Nam Global to Render (Free Tier)

This walks through taking the app from "code on your machine" to "live at
https://namsglobal.com", using the free tiers named in Section 2.21 of the
master spec, hosted on **Render**.

Do these roughly in order — later steps need env var values from earlier ones.

---

## 1. MongoDB Atlas (M0 free tier)

1. Create an account at mongodb.com/atlas and create a new **M0 (Free)** cluster.
2. Under **Database Access**, create a database user with a strong password.
   Give it `readWrite` scoped to this project's database only (Section 2.7a —
   never a cluster-admin credential for the app itself).
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) — Render's
   free tier doesn't have static outbound IPs, so you can't scope this to a
   specific IP range without a paid Render plan. This is a real trade-off of
   the free-tier path; if that's a concern later, Render's paid plans support
   static outbound IPs, at which point you can tighten this.
4. Get your connection string (**Connect > Drivers**) — this is your
   `MONGODB_URI`. It looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nam_global?retryWrites=true&w=majority`

**Note:** M0 has no automated backups. See "Backups" below.

---

## Backups (Section 2.21 / 2.24)

Since Atlas M0 has no automated continuous backup, `.github/workflows/backup.yml`
runs `mongodump` on a daily schedule via GitHub Actions (free, per Section 2.21),
**encrypts the dump before it leaves the runner** (Section 2.7a — never let an
unencrypted backup sit in storage), and uploads it as a GitHub Release asset.

To enable it, add two repo secrets (**Settings > Secrets and variables > Actions**):
- `MONGODB_URI` — same production connection string as Render's
- `BACKUP_ENCRYPTION_PASSPHRASE` — a long random passphrase, stored somewhere
  safe (a password manager) since you'll need it to restore

### Restoring a backup (test this before you need it — Section 2.24)

```bash
# Download the .gz.enc asset from the GitHub Release, then:
openssl enc -aes-256-cbc -pbkdf2 -d \
  -in backup.gz.enc -out backup.gz \
  -pass pass:"<BACKUP_ENCRYPTION_PASSPHRASE>"

# Restore into a SCRATCH database first, never directly into production,
# to confirm the backup is actually intact (Section 2.24's "a backup that
# has never been restored is unverified, not safe"):
mongorestore --uri="<a throwaway Atlas cluster or local MongoDB>" --archive=backup.gz --gzip
```

Do a real test-restore on a cadence (quarterly, or before any major schema
migration per Section 2.24) — treat a failed test-restore as seriously as a
failed CI check.

---

## 2. Upstash Redis (free tier)

1. Create an account at upstash.com, create a new **Redis** database (Regional,
   not Global, is fine and cheaper on their paid tiers if you ever upgrade).
2. Pick a region close to your Render region (see step 6) to minimize latency
   between the app and its session/cache store.
3. Copy the **Redis URL** (rediss:// with TLS) from the database dashboard —
   this is your `REDIS_URL`.

---

## 3. Cloudinary (free tier)

1. Create an account at cloudinary.com — the free tier's 25 monthly credits
   are enough for a new store's initial catalog.
2. From the dashboard, copy **Cloud Name**, **API Key**, and **API Secret** —
   these map to `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`.
3. Product images get uploaded through Cloudinary once the admin media upload
   flow is wired (not yet built as of Stage 10 — see the README's "what's not
   built yet" notes). Until then, seed/demo product images use local paths.

---

## 4. Resend (free tier)

1. Create an account at resend.com (3,000 emails/month free — plenty for order
   confirmations + newsletter at launch scale).
2. Verify your sending domain (`namsglobal.com`) by adding the DNS records
   Resend gives you — this has to happen in whatever DNS provider is
   authoritative for the domain (see the Cloudflare section below; if
   Cloudflare is your DNS host, add these records there).
3. Copy the **API key** — this is your `RESEND_API_KEY`.

---

## 5. Payment providers (Stripe / Paystack / Flutterwave)

Set up whichever you want to accept at launch — none are required to get the
site live, since **WhatsApp checkout works with zero payment-provider setup**
(Section 2.3). For each one you do set up:

- Get the **secret key** (test mode first, live mode once you're ready) and
  the **webhook signing secret** from that provider's dashboard.
- After deploying (step 6), come back and add a webhook endpoint in each
  provider's dashboard pointing at:
  - Stripe: `https://namsglobal.com/webhooks/stripe`
  - Paystack: `https://namsglobal.com/webhooks/paystack`
  - Flutterwave: `https://namsglobal.com/webhooks/flutterwave`
- Toggle providers on/off anytime from **Admin > Site Settings** (Stage 8) —
  a provider only appears at checkout if its keys are set here AND it's
  toggled on there.

---

## 6. Deploy to Render

1. Push this repo to GitHub (Render deploys from a Git repo).
2. In the Render dashboard: **New > Blueprint**, point it at your repo. Render
   reads `render.yaml` and proposes both services (`nam-global` web service,
   `nam-global-worker` background worker) — confirm and create them.
3. Render will prompt for every `sync: false` env var in `render.yaml`. Fill
   in the values from steps 1-5, plus:
   - `SITE_URL=https://namsglobal.com`
   - `SESSION_SECRET=` — generate a long random value, e.g. `openssl rand -hex 32`
   - `ADMIN_DEFAULT_*` — from Section 1.10 (change `ADMIN_DEFAULT_PASSWORD`
     from the spec's dev-seed value before doing this for real — Section
     1.10 explicitly warns that value is a placeholder, never a production
     credential)
4. Deploy. The build command (`npm ci && npm run migrate:up`) runs
   automatically — this creates all the indexes from Stage 2/2.24's migration.
   `migrate-mongo` tracks which migrations already ran, so this is safe to
   leave in the build command permanently; it won't re-run old migrations.

### Seeding production data (a manual, one-time step)

Render's free tier doesn't have pre-deploy commands or shell access (both are
paid-plan features) — so `npm run seed` can't run *on* Render itself the way
it can locally. Instead, run it **from your own machine**, pointed at the
production database:

```bash
# In your local .env, temporarily set:
MONGODB_URI=<your production Atlas connection string>
# Leave NODE_ENV as development (or unset) — the seed script's production
# guard (Section 2.24) checks NODE_ENV, not which database it's pointed at,
# so this is the intended way to run it once against a real cluster.

npm run seed
```

This seeds the Section 1.2 categories, sample brands/products, and the
Section 1.10 admin account. Do this once after the first deploy, then switch
your local `.env` back to a local/dev database for everyday development.

---

## 7. Cloudflare — DNS, WAF, and Access

**Important nuance for a Render deployment specifically:** Section 2.7 of the
master spec describes running `cloudflared` (Cloudflare Tunnel) as a daemon on
your own origin server, so there's no open inbound port to attack. That
pattern is designed for a self-hosted VPS where *you* run the origin process.
**Render is a managed PaaS — Render's own edge is already the public entry
point**, and there's no origin port of yours to hide behind a tunnel the same
way. Running `cloudflared` isn't applicable here, and trying to force it on
would add complexity without the security benefit it provides on a VPS.

What still applies, and is still worth doing, is putting **Cloudflare in front
of Render as a DNS/CDN/WAF proxy**:

1. Add `namsglobal.com` to Cloudflare (free plan), and update your domain
   registrar's nameservers to Cloudflare's.
2. In Render, add `namsglobal.com` as a **Custom Domain** on the `nam-global`
   web service — Render gives you a CNAME target.
3. In Cloudflare DNS, add a CNAME record for `namsglobal.com` (or `www`)
   pointing at that Render target, with the proxy status set to **Proxied**
   (orange cloud) — this is what gives you Cloudflare's CDN, DDoS mitigation,
   and WAF in front of Render's own HTTPS endpoint.
4. **Cloudflare Access (Zero Trust)** in front of `/admin`: Access > Applications
   > Add an application > Self-hosted, path `namsglobal.com/admin*`, and set up
   an email-OTP or SSO policy restricted to your team. This is the second,
   independent login gate Section 2.7 calls for, sitting in front of the
   app's own `/admin` role gating (Stage 8).
5. **WAF rate-limiting rules** on `/login`, `/register`, `/checkout` — Security
   > WAF > Rate limiting rules — as a network-level backstop on top of the
   app's own rate limiters (Stage 3).
6. **Bot Fight Mode** — Security > Bots — enable the free tier's basic
   bot-traffic filtering.
7. Re-point `RESEND_API_KEY`'s domain-verification DNS records (step 4 above)
   into this same Cloudflare DNS zone if you haven't already.

---

## 8. Keeping the free tier warm (optional)

Render's free web services spin down after ~15 minutes of inactivity (a
30-60 second cold start on the next request). Set up **UptimeRobot** (free,
Section 2.21) to ping `https://namsglobal.com/health` every 5 minutes — this
both monitors uptime and keeps the service from sleeping between real visits.

---

## 9. Post-deploy checklist

- [ ] Visit `https://namsglobal.com` — homepage loads, branding/colors correct
- [ ] `https://namsglobal.com/health` returns `{"status":"ok"}`
- [ ] `https://namsglobal.com/ready` returns `{"status":"ready", "checks": {"mongodb": true, "redis": true}}`
- [ ] Log in with the seeded admin account, complete 2FA enrollment (Stage 4
      makes this mandatory for admin/staff roles), change the password
- [ ] Place one real test order through each enabled payment provider's
      test/sandbox mode, and confirm the webhook flips it to `paid`
- [ ] Place one WhatsApp-checkout order and confirm it lands in Admin > Orders
      tagged as a WhatsApp order
- [ ] Confirm `/admin` is unreachable without logging in, and that Cloudflare
      Access's own login screen appears before the app's login page

---

## Upgrading off the free tier later

Every substitution above is swappable via environment variables only, per
Section 2.21:

| From (free) | To (paid) | What changes |
|---|---|---|
| Atlas M0 | Atlas dedicated cluster | Update `MONGODB_URI` only |
| Upstash free | Upstash paid / Redis Cloud | Update `REDIS_URL` only |
| Render free web service | Render paid plan | Same deploy, just upgrade the plan (also unlocks pre-deploy commands and shell access) |
| Render free worker | Render paid worker, or multiple instances | Same deploy; raise `instances` |
| Cloudinary free | Cloudinary paid | Same `CLOUDINARY_*` vars, new plan limits |
| Resend free | Resend paid | Same `RESEND_API_KEY`, higher sending limits |
