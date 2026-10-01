# Joint local checkpoint — 1 October 2026

> Release gate update: the owner later authorized a push after a fresh backup, with direct Service Centre folder edits excluded. See `docs/release-gate-2026-10-01.md` for the current pre-push state. The checks below describe the earlier full local checkpoint; the restricted release must finish its own build/database verification before it is pushed.

At the time this checkpoint was written, no push or deployment was authorized. No live database/schema changes, production repairs, customer deletions or live provider messages were performed. Service Centre data remains untouched. This checkpoint supersedes the pending implementation and recovery items in the 30 September report where explicitly addressed below.

## Completed in this continuation

- Durable payment delivery jobs for accounting, email and Telegram are created with the payment transaction using existing BusinessRecord storage. Concurrent workers claim separate jobs; expired attempts enter manual review. Admin can inspect the latest 100 jobs and queue reviewed failures again. The retry and audit entry commit together. A retry requires checking provider history because external delivery cannot be guaranteed exactly once. No historical payments are backfilled or reactivated.
- UTC comparison fixes expiry checks when the database session uses another timezone. Expired leases are invalidated, preventing an old worker from overwriting review state.
- Admin can maintain approved SMS flow IDs and provider-variable mappings, enabled or disabled, with transactional audit entries. The SMS adapter uses the documented flow request format and reports missing configuration honestly. Provider approval and real acceptance are still required.
- POS checkout, invoice creation, stock deductions, voids and returns share the partner inventory transaction. Repeated SKU demand is aggregated; defective/reserved stock, invalid values and unsupported overpayments are refused. Till opening is serialized; closing reconciles cash change and refunds. Repeated-SKU partial returns fail closed pending an agreed allocation policy.
- POS staff cookies are signed and expire after eight hours. Staff registration requires partner-owner or Admin authorization. Admin sessions in both repositories are signed, purpose-bound and expire after eight hours; legacy cookies require signing in again after deployment. This remains shared-credential Admin access, not named identities or individual revocation.
- Manufacturing completion aggregates repeated material lines and validates quantities. Existing per-order BOM quantity semantics are preserved.
- Email checks provider acceptance instead of assuming success. Telegram calls have bounded timeouts. The partner Designer snapshot includes the updated staff-registration metadata.

## Verification

- 34 partner-app and 14 Admin offline safety checks passed (48 total).
- Five partner-app and three Admin real PostgreSQL checks passed against the exact disposable loopback test database (8 total). These cover concurrency, rollback, queue claiming under Asia/Calcutta database timezone, POS overselling, read-only diagnostics and transactional Admin retry audit. An initially stopped local database was restarted; the real tests then identified and verified the UTC fix.
- Both isolated production builds and TypeScript checks passed, including the final partner-app rebuild after the queue UTC correction. Builds exclude production environment files. Admin emits a non-fatal jose/Edge compatibility warning for unused JWE compression imports; this is not proof of every Edge deployment path.
- Earlier focused browser checks verified Admin sign-in, System Control, Designer and read-only integrity review. This continuation verified saving a disabled synthetic SMS mapping on the local Admin screen, without sending a message. The delivery screen also moved a synthetic review job to Pending; its matching audit entry was verified and the disposable job was removed. Real PostgreSQL tests verify retry concurrency and rollback.
- Backup workflow run 36598556970 succeeded for release backup-20260929-163325. PostgreSQL rehearsal restored 122 application tables / 160,565 rows, matching COPY and manifest counts, with 64 foreign-key relationships checked and no orphans. Migration history was excluded.
- MongoDB rehearsal restored 24,132 documents in 21 application collections with zero failures. A fresh local export matched every restored collection count. System databases were excluded. This proves archive restoration/count agreement, not full application recovery or external-file recovery.
- Private backup files, runtime binaries, disposable data and test builds remain ignored under .local-test-db. User temporary files remain unstaged.

## Still required before calling the entire platform complete

1. Provider readiness is split by channel: Razorpay, Resend and Telegram are wired/configured and need post-deploy acceptance checks; WhatsApp outbound code is ready and needs Meta credentials/templates added in Vercel; SMS remains provider-pending until the provider account and approved flow IDs are acquired. No provider acceptance is inferred from mocked responses. Other module notifications still have process-local delivery paths.
2. Business acceptance for each package offered: module combinations, permissions, documents, imports/accounting, manufacturing per-unit versus per-order quantities, and repeated-SKU return allocation. A catalog of 25 modules / 341 pages does not certify all workflows.
3. Typed editors, validation, preview and change history for settings not yet supported by Admin. Routine supported configuration can be UI-controlled; new logic and structural database changes still require reviewed development.
4. Module-specific dashboard and analytics acceptance for every business type. Admin now lists expected KPIs and workflow checks for every module, but each module still needs user/business sign-off before being offered broadly.
5. External uploaded-file recovery and full operational recovery rehearsal; reviewed handling of any historical integrity findings. Never automatically renumber or repair live records.
6. Other-language and solution-page capability claims need the same review as the English homepage.

Named Admin accounts, per-person roles and per-person revocation are intentionally out of scope while the Admin remains single-owner-only.

The Admin should provide task-specific, validated maintenance controls rather than unrestricted SQL or a bulk-delete console. Any later deployment must be joint and explicitly authorized; no migration is included in this continuation.

Database maintenance is now represented in Admin as a typed control map: read-only health/integrity/search actions, typed maintenance writes, restore-only backup handling and explicitly disabled raw SQL/bulk deletion.

