// Read-only configuration check. Never prints secret values or writes to a database.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const failures = [];
for (const file of ['package-lock.json', '.eslintrc.json', 'next.config.mjs', 'prisma/schema.prisma', 'src/middleware.ts']) {
  if (!fs.existsSync(file)) failures.push(`Missing file: ${file}`);
}
for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED', 'SUPER_ADMIN_SECRET', 'PARTNER_SESSION_SECRET', 'NEXT_PUBLIC_SITE_URL']) {
  if (!process.env[key]?.trim()) failures.push(`Missing setting: ${key}`);
}
if (process.env.PARTNER_SESSION_SECRET && process.env.PARTNER_SESSION_SECRET.length < 32) failures.push('PARTNER_SESSION_SECRET must contain at least 32 characters.');
for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) {
  if (!process.env[key]) continue;
  try {
    const url = new URL(process.env[key]);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) throw Error();
  } catch { failures.push(`Invalid PostgreSQL URL: ${key}`); }
}
if (process.env.NEXT_PUBLIC_SITE_URL) {
  try { if (new URL(process.env.NEXT_PUBLIC_SITE_URL).protocol !== 'https:') throw Error(); }
  catch { failures.push('NEXT_PUBLIC_SITE_URL must be an HTTPS URL.'); }
}
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) failures.push('Razorpay server and public key IDs must match.');
if (process.env.FIELD_FORCE_STANDALONE === 'true') failures.push('FIELD_FORCE_STANDALONE is enabled; this configuration is unsuitable for the main CRM deployment.');
if (!process.env.CRON_SECRET) console.log('REVIEW: CRON_SECRET is required when scheduled jobs are enabled.');
if (!process.env.ADMIN_BRIDGE_SECRET) console.log('REVIEW: ADMIN_BRIDGE_SECRET is required for Admin service calls.');
for (const failure of failures) console.error(`FAIL: ${failure}`);
console.log(failures.length ? `Configuration check failed: ${failures.length} issue(s).` : 'Configuration structure passed. Verify these same settings in the deployment environment; database connectivity and provider delivery are separate checks.');
process.exitCode = failures.length ? 1 : 0;
