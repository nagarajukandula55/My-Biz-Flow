# Module workspace implementation — 7 October 2026

Status: implemented and locally verified; not deployed. The complete platform is **not yet approved for end-to-end launch**. This update follows the [25-module readiness audit](platform-readiness-2026-10-06.md).

## Delivered

- Each of the 24 non-Service Centre modules has an operational dashboard profile with counts from its actual tables. Dashboard, shared analytics, settings links, document numbering and Telegram choices follow the account's configured modules AND active access keys.
- Existing detailed Billing and Telecalling analytics remain available. Other modules gain current operational totals, not invented financial trends. The screens and Telegram messages explicitly distinguish current totals from activity within a reporting period.
- Settings expose relevant management routes, numbering and document defaults. Saving non-Service Centre defaults cannot erase hidden Service Centre terms. Numbering actions now authenticate their callers and reject another account or unavailable module before writing.
- Telegram setup has a shared, owner-only route at `/partner/[partnerId]/settings/notifications`. Owners select destinations and report modules. Only alerts with existing emitters are offered. Chat connections, unrelated routing and report-send history survive preference updates. Help and preview commands are filtered for non-Service Centre businesses.
- Non-Service Centre layouts no longer load Service Centre workorders and profiles for their alert bell. The connection banner opens the appropriate Telegram settings page.
- Admin's Modules page now shows all 25 modules' signup coverage, missing plans and advertised modules absent from the provisioning bundle. It reads catalog configuration without changing it.
- Corrected missing Designer registrations and refreshed the matching Admin catalog. Fixed a Restaurant POS production-build import by reading its query directly from the data layer.

## Service Centre protection

Reused the existing checkouts. No push, deployment or production database mutation was performed. Existing unrelated WhatsApp OTP, telecalling and schema changes in the checkout were preserved.

The 87-file protected Service Centre source baseline still matches after newline normalization. Its workorder, invoice, inventory integration, analytics implementation, templates and partner provisioning source were not edited. Shared pages preserve their existing Service Centre branches; scheduled reports check the configured business type before choosing the new path. Shared numbering actions received authentication checks, so this is not a claim that every shared file is untouched.

Source preservation and local checks reduce risk; they do not establish that a production deployment is risk-free. A representative Service Centre owner/staff regression and a controlled release remain required.

## Database approach

New summaries use one parameterized aggregate statement across active module tables. Tenant IDs, JSON keys and status values are bound parameters; table identifiers come from code. Only counts return to the app, with per-request reuse across the layout and workspace. Numbering settings use two batched reads instead of repeated reads per document. Telegram routing uses an atomic JSON merge.

This avoids fetching entire business-record payloads for the new workspace. Counts still use database resources. No production-scale load benchmark was run and existing detailed report queries elsewhere were not rewritten.

## Verification completed

| Check | Result |
| --- | --- |
| Partner safety suite | 45 passed |
| Admin safety suite | 23 passed |
| Partner isolated PostgreSQL tests | 13 passed across the completed suites, including concurrency, rollback, tenant isolation and signup for all 25 bundles |
| Admin isolated PostgreSQL tests | 3 passed |
| TypeScript and production builds | Passed in both projects |
| Production-server HTTP rendering | 96 pages passed: dashboard, analytics, settings and notifications for all 24 non-Service Centre modules |
| Cross-account HTTP access | 24 attempts denied |
| Protected Service Centre baseline | 87 files matched |

Builds ran from isolated copies without deployment environment files. Database tests and synthetic accounts used the disposable localhost CI database; test accounts were cleaned up. Its schema was brought up to the current checkout while preserving Admin's test table. No production schema change was applied. Admin's build has dependency warnings about JOSE compression APIs in the Edge runtime; the build succeeds, but this should remain visible during release review.

The HTTP checks validate server rendering and access boundaries, not visual browser interaction, every form submission, external provider delivery, or every business transaction in all verticals.

Reproduction: `test:safety` in each project; `test:isolated-db` with the explicit disposable database guard. `tests/workspace.http.integration.cjs` requires the isolated production server on 127.0.0.1:3317, the dedicated test session secret specified in the file, and localhost CI on port 55439. Never run these fixtures against a deployment database.

## Additional fixes completed on 7 October

- Public signup now commits the account, owner and access keys in one transaction. Prefix-level locking and a durable counter prevent concurrent collisions and reuse of deleted IDs. Inactive types, invalid custom values and missing session signing are rejected before account creation. The form now describes the actual automatic-login/password setup flow.
- Clinic, Rentals and Events serialize reservation changes within each business. Date, amount and tenant checks cover create/update/reopen flows. Event venues now participate in overlap checks as well as resources. Event payment increments are serialized and notifications run only after commit. Clinic invoice creation is serialized to prevent duplicate billing.
- Loyalty earns and redemptions lock each member, keeping the points balance and ledger atomic; simultaneous redemptions cannot spend the same points twice.
- Clinic overlap checks evaluate both date boundaries in SQL and return at most one conflict instead of fetching appointment history. UTC comparison is independent of the database session timezone. No index or production schema change was made; production-scale load measurement remains outstanding.
- Client-only event constants, rental overdue calculations and loyalty rules are separated from server database imports. The application production build succeeds after correcting these browser/server boundaries.
- [Market-based pricing decisions](module-pricing-2026-10-07.md) cover all 24 non-Service Centre modules. The read-only live snapshot contained 19 business types and 49 plans. The release proposal uses private, dated plan versions and preserves every existing plan/customer association. Field Force stays free with its existing capacity metadata and separate transaction fees. Service Centre prices are excluded.
- Admin has a private pricing review panel on Modules, with scope limitations and source links. It uses a bundled snapshot and adds no database query.

The six new PostgreSQL cases include concurrent reservations, conflict reopening, foreign-tenant references, duplicate clinic billing, event payment sums, notification rollback, loyalty races, atomic signup failure and deletion-safe ID allocation. One case provisions all 25 configured/proposed module bundles and checks owner, trial and exact access keys. This is provisioning coverage, not acceptance of every module transaction or public payment journey.

## Still required before full launch

1. Publish reviewed signup catalog configuration after acceptance. The missing eight offerings are prepared in the proposal, but the shared live database is unchanged. New draft types are inactive and draft plans private; existing signup links are unchanged. The earlier null-priced gap proposal is superseded commercially by market-pricing-proposal-2026-10-07.json.
2. Verify tier-specific page access and enforce user/location capacities before selling differentiated tiers. Existing bundles are preserved; automatic posting, statutory integrations and provider delivery must not be assumed from a module name.
3. Run the business-specific transaction acceptance matrix in the original audit: setup, staff roles, sale/service/booking, cancellation/refund, stock/ledger/document reconciliation, plans and retries. Core concurrency fixes and the shared-page checks do not establish every sector's complete workflow.
4. Verify Telegram/payment/message providers in an approved test environment and complete browser interactions plus existing-user Service Centre regression before deployment.
5. Leave the existing Service Centre Ultimate/GST catalog mismatch unchanged pending a separately tested transition, as requested.

The repository's database safeguard requires a human to apply shared production data/schema changes from their own terminal after reviewing them. No live price, customer record, existing subscription, production schema or deployment was changed. No additional vertical is recommended until these release conditions are closed.
