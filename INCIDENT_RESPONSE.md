# Incident Response Plan

## Severity levels

| Level | Example triggers |
|---|---|
| **Low** | A single failed login. A customer reports a minor UI bug. One 4xx spike in logs. |
| **Medium** | Repeated failed logins against one account (already auto-locked by Stage 4). A payment webhook signature failure that looks like a misconfiguration rather than an attack. A dependency vulnerability flagged by `npm audit`/Dependabot at "moderate" severity. |
| **High** | A single admin/staff account shows signs of compromise (login from an unrecognized location, unexpected role change in the audit log). A payment provider reports a dispute pattern suggesting card testing. A "high" or "critical" `npm audit` finding in a security-sensitive package (auth, crypto, payment SDKs). |
| **Critical** | Confirmed admin account compromise. Evidence of a data leak (customer PII, order data) outside the system. Site-wide outage caused by a suspected attack rather than a normal deploy/infra issue. Payment provider webhook secret or database credentials found exposed (e.g. accidentally committed to git history). |

**Default response by severity:**
- Low → log it, no immediate action beyond normal triage.
- Medium → investigate within the same working day; consider a targeted session kill (below) if a specific account is involved.
- High → investigate immediately; kill the specific account's sessions; consider rotating the credential most likely exposed.
- Critical → global session kill-switch; begin the credential rotation runbook below; notify per the matrix below.

---

## Session kill-switch (Section 2.23)

Built in Stage 12 (`services/sessionKillSwitch.js`), exposed at
**Admin > Incident Response** (super_admin only):

- **One account:** enter the account's email → invalidates every active
  session for that account immediately. Use for a High-severity single-account
  compromise.
- **Global:** requires typing `INVALIDATE ALL SESSIONS` exactly → invalidates
  every active session on the site. Use only for a Critical, suspected
  system-wide breach — this logs out every customer and every admin,
  including yourself.

Both actions are logged to the append-only audit trail (`action:
"security.session_kill_user"` / `"security.session_kill_all"`), including who
triggered it and how many sessions were invalidated.

Password changes (Stage 4/12) already auto-invalidate a user's other sessions
as a standing defense-in-depth measure — the admin kill-switch above is for
cases where the affected person hasn't (or can't) changed their own password
yet.

---

## Credential rotation runbook

If a High or Critical incident suggests a specific credential may be exposed,
rotate it in this order (later steps depend on earlier ones being done first):

1. **Session secret** (`SESSION_SECRET`): generate a new random value, update
   it in Render's environment variables, redeploy. This immediately
   invalidates every existing session's signature — functionally equivalent
   to (and a good backstop alongside) the global kill-switch above, since
   old session cookies can no longer be verified against the new secret.
2. **Database credentials** (Atlas): create a new database user with the
   same scoped `readWrite` permissions (Section 2.7a — never cluster-admin),
   update `MONGODB_URI` in Render, redeploy, *then* delete the old database
   user from Atlas.
3. **Redis/Upstash credentials**: rotate the Upstash token, update
   `REDIS_URL`, redeploy.
4. **API keys** (Cloudinary, Resend, payment providers): rotate via each
   provider's own dashboard (most support creating a new key and revoking
   the old one without downtime), update the corresponding env var, redeploy.
5. **OAuth client secrets** (Google/GitHub): rotate via each provider's
   developer console, update `GOOGLE_CLIENT_SECRET`/`GITHUB_CLIENT_SECRET`,
   redeploy.
6. **Admin account passwords**: force a password reset for any admin/staff
   account with access to the exposed credential.

After any rotation: confirm the app actually reconnects successfully
(`GET /ready` should report `mongodb`/`redis` both `true` again) before
considering the rotation complete.

---

## Notification matrix

| Severity | Notify |
|---|---|
| Low | No notification required beyond normal team visibility (logs). |
| Medium | Developer/on-call, same day. |
| High | Developer + business owner, immediately. |
| Critical | Developer + business owner, immediately. If the incident involves confirmed exposure of customer personal data, also: (a) affected customers, without undue delay, describing what happened and what they should do; (b) Nigeria's data protection authority (the Nigeria Data Protection Commission), per NDPR notification requirements — get specific current guidance on timelines and process from a legal advisor rather than relying on this document alone, since regulatory requirements can change. |

---

## Post-incident review (Medium+ only)

After any Medium-or-higher incident, once resolved, write up:
1. **What happened** — timeline, what was affected.
2. **What contained it** — which action (kill-switch, credential rotation,
   code fix) actually stopped the issue.
3. **What changes prevent recurrence** — a specific, assigned follow-up
   (not just "be more careful"). Feed this back into this document and the
   master spec if it reveals a gap in the plan itself.

---

## PCI DSS scope note (Section 2.23)

Card data is handled entirely by Stripe/Paystack/Flutterwave's own hosted
checkout/redirect flows (Stage 7) — it never touches this application's
server, logs, or database. This keeps the project within **PCI DSS SAQ-A**,
the lightest self-assessment tier. This assumption breaks the moment a future
feature adds a custom card-input form instead of a provider's hosted fields —
re-verify SAQ-A eligibility if the checkout flow ever changes that way.

If a customer ever pastes card details into a support ticket or contact form
by mistake: redact and delete it immediately, don't leave it stored, and
don't file it as a normal support ticket attachment.

---

## Ongoing hygiene

- Review admin/staff accounts and their roles on a regular cadence (e.g.
  quarterly) via **Admin > Users** — disable (`toggle-active`) any account
  no longer needing access rather than leaving it dormant.
- Keep `security.txt`'s disclosure contact current and actually monitor that
  inbox (see the note in the security hardening section of the main spec).
