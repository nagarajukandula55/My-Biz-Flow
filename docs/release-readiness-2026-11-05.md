# Release readiness — 5 November 2026

## Result

Code checks passed. Production environment readiness and live workflow acceptance remain unverified. No deployment or shared-database schema/data changes were performed.

## Verified

- Production build completed successfully using `NEXT_DIST_DIR=.next-release-online` to avoid Windows permissions on the existing `.next` output. All 92 static pages generated. Build used the local configured environment and network access for Google Fonts.
- TypeScript passed.
- Lint passed with existing quotation-format warnings. Core Web Vitals and other application rules remain enabled; no build-ignore switch was added.
- Offline safety suite: 86 passed.
- Disposable loopback PostgreSQL integration suite: 44 passed. Initial failures revealed outdated explicit test dependencies and counts from before Interior Design; these were corrected while retaining tenant, transaction and authorization assertions.
- Static module audit: 27 modules, 367 pages, no missing registration imports or definitions.
- Package dependency declarations match the lockfile. Git whitespace check passed.

## Prepared

- Added persistent ESLint configuration and removed an obsolete rule suppression.
- Narrowed TypeScript inputs to source, Tailwind configuration and normal Next.js generated types, excluding disposable application copies.
- Added `npm run check:deployment`; it validates required setting presence and URL structure without printing secrets or changing data.
- Included work-order error tests in the regular safety suite. Recorded the four explicitly scoped Service Centre preservation-baseline updates in `service-centre-approved-review-2026-11-05.json`.
- Updated deployment instructions, environment comments and temporary build exclusions. Updated the isolated build-copy script to include ESLint configuration.

## Before production promotion

The local configuration check reports missing `SUPER_ADMIN_SECRET`, `PARTNER_SESSION_SECRET`, and `NEXT_PUBLIC_SITE_URL`. This does not establish whether they are configured in Vercel. Verify the existing production values there; preserve the session secret to avoid invalidating user sessions. Verify scheduled-job `CRON_SECRET` and the Admin bridge settings for the enabled integrations.

The original recurring production work-order exception could not be correlated with live logs. Preview acceptance should cover login, opening/editing/saving a work order, validation messages, completion and handover/invoice generation using designated test data. Confirm actual deployment database connectivity and error-reference logging before promotion.
