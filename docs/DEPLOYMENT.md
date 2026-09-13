# Deploying to Vercel (mybizflow.in)

This is a checklist for a human configuring the Vercel project dashboard
(Project > Settings > Environment Variables) before going live. Claude has
no Vercel access and did not configure anything here — this is instructions
for you to follow manually. Full explanatory comments for each var live in
`.env.example`; this file is just the go/no-go grouping.

## Required for basic operation (app will not boot / core flows break without these)

- `DATABASE_URL` — Neon Postgres connection string.
- `DATABASE_URL_UNPOOLED` — direct connection for migrations (Neon's Vercel
  integration usually sets this automatically — verify it's present).
- `SUPER_ADMIN_SECRET` — shared admin-login password. Pick a strong random
  value; do not reuse the value from any other AN Group app.
- `PARTNER_SESSION_SECRET` — signs partner session cookies once real signed
  sessions are wired up (see `src/lib/partnerSession.ts`). Generate with
  `openssl rand -hex 32`.
- `NEXT_PUBLIC_SITE_URL` — set to `https://mybizflow.in` in production.

## Required for a specific feature to work

Safe to leave unset at first launch — the rest of the app keeps working —
but set before the corresponding feature is advertised to users.

- **Subscription checkout / billing (Razorpay):** `RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`,
  `RAZORPAY_WEBHOOK_SECRET`.
- **Vendor payment sync into AN-Accounting:** `CENTRAL_API_URL`,
  `CENTRAL_API_KEY` (from AN-Accounting's Settings > Sales API page).
- **Field Force SMS job-offer pings:** `SMS_API_KEY`, `SMS_SENDER_ID`.
- **Vercel Cron route auth:** `CRON_SECRET` (set alongside the cron
  schedule in `vercel.json`).
- **Service Centre photo/document uploads (Cloudinary):**
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
  Note: the env vars alone do not turn this on — no upload code path exists
  yet in this app (see `.env.example` comment). Setting these now only
  future-proofs the Vercel config; the upload feature itself is a separate
  follow-up build.
- **Transactional email (Resend):** `RESEND_API_KEY`, `RESEND_FROM`. Same
  caveat as Cloudinary above — no mailer module exists yet.
- **Web push notifications (VAPID):** `VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Same
  caveat — no web-push SDK installed yet.
- **Dedicated single-partner Field Force deployment only** (never on the
  main mybizflow.in project): `FIELD_FORCE_STANDALONE=true`,
  `FIELD_FORCE_PARTNER_ID`.

## Optional (cosmetic / statutory defaults)

- `PLATFORM_LEGAL_ENTITY_NAME` — defaults to "AN Group" if unset. Confirm
  the exact registered legal name before relying on this for statutory
  billing documents.

## Explicitly not ported from AN-CRM

These exist in AN-CRM but do not apply to My-Biz-Flow and were deliberately
left out — do not add them to Vercel for this project:

- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_GROUP_ID` / `TELEGRAM_RELAY_ENABLED` /
  `ANOPS_TELEGRAM_*` — AN-CRM's own internal ops/admin Telegram tooling.
- `AI_HUB_SECRET`, `ANU_SERVICE_KEY`, `AN_CRM_SERVICE_TOKEN`,
  `AN_CRM_MY_BIZ_FLOW_BUSINESS_ID` — AN-CRM's own internal service-to-service
  auth between its modules (AI Hub, ANU issue tracker, its own vendor
  self-signup flow that happens to reference *this* app's business id from
  *AN-CRM's* side — not something My-Biz-Flow itself needs to read).
  `AN_CRM_MY_BIZ_FLOW_BUSINESS_ID` in particular is the reverse direction:
  AN-CRM stores which My-Biz-Flow business record to attribute signups to;
  it belongs in AN-CRM's own env, not here.
- `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY` — AN-CRM's AI Hub
  provider keys for its own AI orchestrator feature; My-Biz-Flow has no
  equivalent AI feature today.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — AN-CRM's Google OAuth login;
  not part of My-Biz-Flow's auth model.
- `NATIVE_MONGODB_URI` — AN-CRM's connection to a separate "native" app's
  Mongo database; unrelated to this Postgres-backed app.
- `MONGODB_URI` — AN-CRM's primary datastore is MongoDB; My-Biz-Flow uses
  Postgres/Prisma (`DATABASE_URL` above) instead, not a port of this var.
  `MSG91_AUTH_KEY` / `MSG91_TEMPLATE_ID` — AN-CRM's specific SMS vendor
  shape; My-Biz-Flow's `SMS_API_KEY`/`SMS_SENDER_ID` already generalize this
  (see the comment in `.env.example` — swap the fetch() body for a
  different vendor instead of hardcoding MSG91's field names).
- `COMPANY_*` (`COMPANY_NAME`, `COMPANY_GSTIN`, etc.) — AN-CRM's own
  registered-company letterhead fields for its statutory documents;
  My-Biz-Flow's equivalent is `PLATFORM_LEGAL_ENTITY_NAME` plus whatever a
  partner sets for their own business, not a direct port.
- `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_BASE_URL`
  / `NEXT_PUBLIC_HELPDESK_URL` — AN-CRM-specific multi-URL setup and its own
  helpdesk link; My-Biz-Flow already covers the canonical-domain case with
  `NEXT_PUBLIC_SITE_URL`.

## Already covered, different semantics — read before assuming parity

- **Central-api / accounting sync direction.** AN-CRM's `ACCOUNTING_API_URL`
  / `ACCOUNTING_API_KEY` push AN-CRM's own vendor billing invoices into the
  separate AN-Accounting app. My-Biz-Flow's `CENTRAL_API_URL` /
  `CENTRAL_API_KEY` do the same *for this app's* captured subscription
  payments — same shape, same target (AN-Accounting), but a distinct
  business/API key pair. Do not reuse AN-CRM's key here.
- **Razorpay.** Same provider, same var names, independent Razorpay account
  keys — do not reuse AN-CRM's Razorpay credentials for this project.
