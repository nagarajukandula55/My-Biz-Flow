# Deploying My Biz Flow

## Release configuration

Deployment target: the existing Vercel main CRM project. Install with `npm ci`, build with `npm run build`; Next.js output is `.next` unless `NEXT_DIST_DIR` is explicitly set for an isolated check. `postinstall` generates the Prisma client and does not apply migrations. Keep `.env`, `.env.local`, local test data and `.next-*` build folders out of the deployment source.

Run `npm run check:deployment` in the intended environment. It checks file presence and configuration structure without printing credentials or contacting the database. It does not inspect Vercel settings from a local checkout.

Required settings:

- `DATABASE_URL`: PostgreSQL runtime connection.
- `DATABASE_URL_UNPOOLED`: direct PostgreSQL connection expected by the Prisma schema.
- `SUPER_ADMIN_SECRET`: secure admin cookie verification secret; coordinate with the Admin deployment.
- `PARTNER_SESSION_SECRET`: stable random session-signing secret, at least 32 characters. Preserve the existing production value to keep current sessions valid.
- `NEXT_PUBLIC_SITE_URL`: `https://www.mybizflow.in` for the main production site. Preview deployments need their own intended URL.

Configure `ADMIN_APP_URL` and, when used, `ADMIN_COOKIE_DOMAIN` to match the separate Admin app. `ADMIN_BRIDGE_SECRET` must agree between both apps for Admin service requests. Leave `FIELD_FORCE_STANDALONE` and `FIELD_FORCE_PARTNER_ID` unset on the main CRM project.

## Features and scheduled jobs

- Razorpay checkout: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, matching `NEXT_PUBLIC_RAZORPAY_KEY_ID`; configure `RAZORPAY_WEBHOOK_SECRET` for the webhook.
- Transactional email: `RESEND_API_KEY`, `RESEND_FROM` and a verified sender/domain.
- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`; configure the webhook and platform/partner destination chats.
- WhatsApp: `WHATSAPP_BUSINESS_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN` and approved templates; OTP login additionally needs `WHATSAPP_OTP_TEMPLATE_NAME` and its language.
- Google login: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; register the exact site URL plus `/api/auth/google/callback` as the callback.
- Accounting integration: `CENTRAL_API_URL`, `CENTRAL_API_KEY`; wallet endpoints and feature toggles are separate.
- Scheduled jobs run through `.github/workflows/cron.yml`. Set the same `CRON_SECRET` in Vercel and GitHub, plus GitHub's `APP_URL`. Do not leave production scheduled routes without authentication.

See `.env.example` and `src/lib/env.ts` for additional settings and feature-specific defaults. Placeholder Cloudinary/VAPID settings alone do not enable an upload or push feature.

## Release checks

1. `npm ci`
2. `npm run lint` (existing quotation-format findings are warnings; application checks remain enabled)
3. `npm run typecheck`
4. `npm run test:safety`
5. Run `npm run test:isolated-db` with the explicit disposable loopback database configuration described in `.github/workflows/ci.yml`. Never point these tests at production.
6. `npm run build` with internet access for the current Google font downloads and the required configuration available.
7. Check the deployment's actual database connectivity and environment settings. A successful local build does not certify these.
8. In preview, verify owner login, opening a work order, saving a field, validation feedback, repair completion and handover/invoice generation using designated test data. Check error references against server logs. Promote only after these checks pass.

## Shared database safety

The main and Admin apps share a database. This release includes one additive, non-destructive index migration for bounded BusinessRecord reads. Do not add `prisma migrate deploy`, `migrate dev`, `db push`, reset or data-seeding commands to the production build. After confirming the daily backup workflow has succeeded, apply the pending migration once with the direct/unpooled production connection, then verify the index exists. Follow `CLAUDE.md` for any separately reviewed database change.

## Work-order error change

Expected validation/session errors are returned as readable action results. Unexpected failures are recorded with a reference in server console and central error logging; private details remain server-side. If an action fails, refresh the record to check committed state before retrying, especially after handover. This change improves diagnosis and feedback; the original recurring production exception still needs correlation with a live server log.
