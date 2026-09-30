# Audit continuation — 29 September 2026

## Fresh backup verified

- Run: https://github.com/nagarajukandula55/My-Biz-Flow/actions/runs/36598556970

- Dispatched at 16:33:15 UTC; backup, cleanup and notification jobs succeeded.

- Release: https://github.com/nagarajukandula55/My-Biz-Flow/releases/tag/backup-20260929-163325

- PostgreSQL: `db-backup-20260929-163325.sql.gz`, 5,773,203 bytes, uploaded.

- MongoDB: `mongo-backup-20260929-163325.archive`, 3,737,228 bytes, uploaded.

- Manifest: `manifest-20260929-163325.json`, 2,957 bytes; inspected successfully.

- Core counts: 25 partners, 3 partner staff, 2,729 business records, 159 migration-history entries.

- Workflow comparison against `backup-20260929-121845`: zero tables with decreased counts.

This verifies successful backup creation and asset upload, not recoverability through a restore drill. The workflow captures its manifest separately from its PostgreSQL dump. No restore or live database mutation was performed.

## Local build safety

Both MBF and Admin now use `next build` for their normal build script. Compilation no longer automatically executes `prisma migrate deploy`. Existing migrations and live data are unchanged. Schema rollout remains a separate human-reviewed procedure under each repository's database-safety rules; a successful build does not mean a schema change has been applied.

Build prerendering can still read configured services. Full build validation must use an isolated database and safe integration configuration. The existing CI provisions a disposable database for this purpose.

## Remaining handoff work

Admin client/schema compatibility, payment verification, cron authorization, recurring invoice idempotency, stock transactions, staff authorization, module readiness/settings/dashboard/analytics, and marketing improvements remain open. Historical invoice reconciliation and any live schema/data repairs remain separate review items. No deployment or production readiness is claimed.

## Local continuation — 30 September

- Cron endpoints now fail closed when their shared secret is missing or incorrect.

- Staff session resolution rechecks active staff status before permitting mutations.

- Login chooses a recognized module with an active entitlement, otherwise the dashboard.

- Checkout and webhook use the same payment acceptance service: provider-fetched order ownership, captured status, currency, amount and selected plan/cycle/offer are checked. Payment insertion and activation share one transaction and a partner row lock. Existing payments do not reactivate cancelled subscriptions. External calls are outside the transaction.

- New checkout orders include offer and plan-label snapshots. Older orders with a now-incompatible selection fail for reconciliation; they are not silently reassigned. Amounts remain whole rupees to match the existing integer column; fractional-rupee payments are explicitly rejected rather than rounded. No schema migration was generated.

- Payment-provider requests and subscription accounting fetches have explicit timeouts. Durable receipt/accounting delivery retries remain open.

- The Admin repository now has a System Control screen, backup controls and action-level authorization. Its global partner wipe is disabled. See the Admin repository's `docs/system-control-rollout.md` for scope and setup.

The security and payment tests use mocked services and database transactions. They verify validation and call ordering, not real PostgreSQL concurrency or rollback. A provider sandbox and isolated-database test are required before deployment. No actual payment, notification, production query, restore or database change was executed in this continuation.

Payment provider references: https://razorpay.com/docs/api/orders/fetch-with-id/ and https://razorpay.com/security/checklist

Still open: Admin client compatibility; telecalling actor/lead binding; stock concurrency; recurring invoice idempotency and numbering; analytics identity/scoping; module readiness/settings; marketing; durable integration retries; full recovery and end-to-end tests. Service Centre's current records and storage paths are preserved.

## Local continuation — 30 September 2026

- Telecalling forms bind call/message staff identity to the signed-in active Telecaller and enforce assigned/territory queue visibility. Owner/Admin manage leads, assignments and templates.

- Assignment destinations must be active Telecallers from the same partner. Automatic assignment uses conditional updates so concurrent manual assignments are not overwritten, and returns actual affected counts.

- Call log creation and lead-status update use one transaction; outcome and callback dates are validated. Provider notification still follows commit.

- Added isolated authorization and transaction-boundary tests. These mocks do not constitute a PostgreSQL concurrency/integration test.

- No production changes, migration, push or deployment. Broader inventory transactions, analytics, module readiness, provider delivery and restore rehearsal remain outstanding.

### Recurring billing follow-up

Recurring invoice creation now locks the template row and commits the invoice, document-number counter and schedule advancement in one transaction. It uses a deterministic partner/template/period record key, stores the invoice number, validates schedule values and reads fresh template fields after locking. Historical invoices and numbering remain unchanged. Each failed template is reported without blocking other partners. Intentionally disabled customer-invoice mirroring is reported as disabled rather than a failed integration.

Eleven main-app safety tests pass, including simulated overlapping runs and rollback; actual PostgreSQL concurrency and deployed end-to-end tests are still pending. Numbering accepts an optional transaction client; existing callers retain their existing behavior.


## Inventory, analytics, Admin diagnostics and module coverage

Local implementation now includes:
- Shared transaction context for record-lock operations, including nested helper calls and stock-lot transactions. Transaction-scoped reads bypass React caching.
- Partner-scoped stock locking and atomic inventory forms for adjustments, transfers, stock take, returns and part orders; manufacturing completion and Service Centre workorder operations share the transaction. Returned validation errors roll back prior line writes. Redirects and success notifications follow commit.
- Existing non-strict Service Centre shortage behavior remains unchanged. Strict mode rechecks available stock and consumed serials within the lock. No stock balance, serial, invoice or storage format is migrated.
- Inventory CSV transformation and record insertion are atomic per row. Bulk imports still report row-by-row outcomes; review module-specific ledger completeness before enabling bulk imports broadly.
- Analytics uses real sessions and enabled modules, suppressing both charts and queries for disabled modules. Staff cannot access owner analytics. Revenue trend uses collected amounts.
- All 25 module entry routes and 334 partner pages are covered by Designer registration imports; Accounting now has an entry route. Static coverage does not certify runtime business workflows.
- Homepage business packages follow active Admin configuration, including custom type identifiers. Existing data tables remain in use.
- SMS/WhatsApp result handling separates provider acceptance, failure and missing configuration. Payment receipt channel failures reach the error log. Durable retry/outbox processing remains a separate implementation item; the current post-commit queue is process-local.
- Admin has an authenticated, bounded read-only integrity review for duplicate invoice numbers, duplicate stock buckets and invalid stock quantities, plus a static module coverage snapshot. No repair button or live data mutation was added.

Provider reference: MSG91's documented Flow API requires a provider template and recipient variables (https://docs.msg91.com/sms/send-sms). The existing free-text SMS adapter still needs an approved-template mapping before production SMS can be certified; acceptance is not a delivery receipt.

### Release gates

Keep both repositories local until joint review. Full release requires isolated PostgreSQL transaction tests, full builds, browser checks, provider sandbox tests, a backup restore rehearsal and business-owner acceptance of each offered workflow. The CI workflow now runs offline safety tests and guarded PostgreSQL integration tests against its disposable localhost service. Those tests refuse production URLs. No production schema command, data repair, restore, notification or deployment has been run during implementation.

## Verified checkpoint

See `release-status-2026-09-30.md` for current completed checks and remaining scope. The isolated PostgreSQL tests, both builds and a PostgreSQL data-only restore rehearsal have now passed; earlier pending-test entries above are historical. No live database changes or push occurred.
