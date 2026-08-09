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
};
