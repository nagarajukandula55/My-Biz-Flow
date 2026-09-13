/**
 * Central place for reading required environment variables. Reads are
 * lazy (checked when the value is actually used, not at import time) —
 * CENTRAL_API_URL isn't wired to anything yet, so eager validation at
 * module load would crash every page before that feature even exists.
 * Once a variable is actually consumed somewhere, its getter here is the
 * only place that should read `process.env` directly for it — don't
 * reach for `process.env.X` ad hoc elsewhere, so there's exactly one
 * place to update if a var is renamed or a default is added.
 *
 * DATABASE_URL is the one exception: Prisma reads it directly via
 * `env("DATABASE_URL")` in prisma/schema.prisma (both the CLI and the
 * generated client require this — Prisma doesn't accept a value threaded
 * through app code), so `env.databaseUrl()` below exists for any
 * non-Prisma code that wants the same value, not as the source of truth.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env.local and set it.`
    );
  }
  return value;
}

export const env = {
  superAdminSecret: () => requireEnv("SUPER_ADMIN_SECRET"),
  /** Signing secret for the partner session JWT (src/lib/partnerSession.ts).
   * Required — there is no insecure fallback. Without this set, every
   * partner login/session-check throws rather than silently issuing an
   * unsigned or default-keyed cookie. */
  partnerSessionSecret: () => requireEnv("PARTNER_SESSION_SECRET"),
  databaseUrl: () => requireEnv("DATABASE_URL"),
  centralApiUrl: () => requireEnv("CENTRAL_API_URL"),
  centralApiKey: () => requireEnv("CENTRAL_API_KEY"),
  /** Payment gateway — optional until a Super Admin/the business owner adds real Razorpay keys
   * (Vercel env vars). Unset returns undefined rather than throwing, so the rest of the app keeps
   * working before the gateway is configured; only the actual checkout/verify calls need it. */
  razorpayKeyId: () => process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: () => process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET,
  /** Public key id, exposed to the browser for the Razorpay Checkout widget — same value as RAZORPAY_KEY_ID. */
  razorpayPublicKeyId: () => process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  /** Optional bearer secret Vercel Cron sends as `Authorization: Bearer <value>` (set alongside the
   * cron schedule in vercel.json). Unset means the route runs unauthenticated, e.g. in local dev. */
  cronSecret: () => process.env.CRON_SECRET,
  /** SMS "ping" for Field Force job offers — optional, cost-free by default.
   * Unset means src/lib/sms.ts no-ops (logs only) instead of throwing, same
   * graceful-degradation posture as the Razorpay keys above. */
  smsApiKey: () => process.env.SMS_API_KEY,
  smsSenderId: () => process.env.SMS_SENDER_ID,
  /** Set on a SEPARATE deployment (its own Vercel project/domain, same repo
   * + DB) that should expose ONLY the Field Force Customer/Provider
   * self-serve app — nothing else in My Biz Flow. See src/middleware.ts. */
  fieldForceStandalone: () => process.env.FIELD_FORCE_STANDALONE === "true",
  /** Which partner's Field Force storefront this standalone deployment is
   * for — a dedicated app deployment serves exactly one partner's brand. */
  fieldForcePartnerId: () => process.env.FIELD_FORCE_PARTNER_ID,
  /** Legal entity behind the "My Biz Flow" brand — used ONLY on the platform's
   * own subscription billing documents (the invoices/receipts/checkout screens
   * My Biz Flow issues to partners for their platform subscription charges).
   * Every OTHER invoice in this app (Service Centre, Billing module, etc.) is
   * issued by the partner to their own customer and must NOT show this name —
   * see AGENTS.md / the Service Centre & Billing scope notes.
   * Defaults to "AN Group" per CLAUDE.md's references to the parent company —
   * TODO(owner): confirm/replace with the exact registered legal name
   * (e.g. "AN Group Pvt Ltd" / GSTIN-holding entity) before this is relied on
   * for statutory documents. */
  platformLegalEntityName: () => process.env.PLATFORM_LEGAL_ENTITY_NAME || "AN Group",
  /** Cloudinary — Service Centre before/after job photos, KYC docs, signed agreements
   * (beforePhotos/afterPhotos/kycDocRef/agreementDocRef fields in
   * src/lib/sample-data/service-centre*.ts). No SDK installed and no upload route wired up
   * yet; these getters are placeholders ahead of that follow-up work, ported from AN-CRM. */
  cloudinaryCloudName: () => process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: () => process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: () => process.env.CLOUDINARY_API_SECRET,
  /** Resend — transactional email (partner welcome emails, password resets), ported from
   * AN-CRM. No mailer module exists in this app yet; placeholder ahead of that follow-up. */
  resendApiKey: () => process.env.RESEND_API_KEY,
  resendFrom: () => process.env.RESEND_FROM,
  /** Web push (VAPID) — job/workorder notifications, ported from AN-CRM. No web-push SDK
   * installed yet; placeholder ahead of that follow-up. */
  vapidPublicKey: () => process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: () => process.env.VAPID_PRIVATE_KEY,
  vapidSubject: () => process.env.VAPID_SUBJECT,
};
