# Joint release status — 30 September 2026

This is a local implementation checkpoint, not approval to push or deploy. It supersedes earlier pending-test notes in the continuation logs. The live Service Centre database, schema, migration history and storage were not changed.

## Verified

- Backup workflow run 36598556970 completed successfully for release `backup-20260929-163325` before implementation. PostgreSQL, MongoDB and row-count manifest assets were verified as uploaded.
- PostgreSQL data-only recovery rehearsal restored **122 application tables / 160,565 rows** into a separately named local database. Every restored table matched both its COPY block and the manifest; no count differences. Migration history was excluded. All **64 foreign-key relationships** were checked afterward with no orphan findings. MongoDB, uploaded files and a full operational disaster recovery exercise remain outside this result.
- **25 partner-app + 12 Admin offline safety tests** passed. **Three partner-app + two Admin real PostgreSQL tests** passed against the disposable database: actual stock locking/rollback, recurring-invoice concurrency, read-only diagnostics and concurrent routing updates.
- Both production builds and TypeScript checks passed with production environment files excluded. The build exposed and prompted a fix for server transaction code leaking through shared imports into a browser bundle.
- Local browser checks covered Admin sign-in, System Control layout, the Designer catalog and an on-demand integrity scan. The empty disposable database correctly showed zero findings; this says nothing about production integrity. The partner homepage rendered successfully. These are focused checks, not complete business-workflow acceptance.

## Delivered locally

- Authenticated Admin System Control, backup request/history controls, bounded read-only database health and integrity checks. Bulk partner wipe remains disabled.
- Admin notification routing preserves unknown preferences and report history, including concurrent edits. Client definitions align with the partner app's existing Telegram/staff fields without a live migration.
- Shared inventory transaction context; stock locks and nested writes use the same transaction. Reviewed inventory forms and Service Centre operations roll back on validation/write failures. Success notifications and navigation follow commit.
- Invoice inventory consumption remains opt-in per line, with shortage/serialized-item validation, shared stock allocation and consumption history. Catalog status controls use browser-safe constants.
- Payment verification and activation safety, recurring-invoice idempotency, staff/Telecalling action and read boundaries, enabled-module analytics, honest provider acceptance/failure reporting.
- Static coverage includes 25 module roots and 334 module pages. The generated partner Designer catalog additionally contains seven shared partner pages (**341 definitions** total). Admin now consumes that catalog rather than relying only on stale partner-page copies; Telecalling and Accounting are discoverable. Catalog membership is not a promise of an available field editor or a complete workflow.
- English homepage copy describes configuration and module dependencies instead of promising every business is ready immediately.

## Remaining work before joint release

1. Durable payment receipt/accounting delivery jobs with idempotent retries and an Admin retry/status UI. The current after-commit queue is process-local and failure logging is not durable delivery.
2. Approved SMS template mapping and provider sandbox acceptance for payment, email, SMS, WhatsApp and Telegram. No live payment or message was sent during this work.
3. End-to-end acceptance for each business package actually offered. Review remaining stock callers (including POS), manufacturing repeated-material/quantity semantics, import ledger completeness, permissions, documents and module-specific settings. Existing generic forms and registered pages do not certify all 25 business workflows.
4. Complete typed Admin controls for unsupported settings, including validation, previews and rollback history. Refresh schema/field definitions alongside the catalog; discovery alone does not supply missing editors. Structural changes and new business logic still require tested development.
5. Named administrator identities, revocable sessions and durable attributable audit history before expanding maintenance privileges. Existing shared-secret authentication is a known limitation.
6. Rehearse MongoDB/file recovery and full application recovery; separately review historical invoice/stock findings. Never renumber or repair live records automatically.
7. Review other-language marketing and solution pages for the same capability limits as the English homepage.

## Reproducible catalog and recovery checks

Run `node scripts/audit-module-coverage.cjs` and copy `docs/module-coverage.json` to Admin's `src/lib/moduleCoverage.json`. Run `node scripts/export-designer-catalog.cjs` and copy `docs/partner-designer-catalog.json` to Admin's `src/lib/designer/partnerCatalog.json`. The partner safety suite rejects stale page metadata.

Recovery scripts `rehearse-local-restore.cjs` and `verify-local-restore.cjs` require `MBF_ISOLATED_TEST=1` and the exact named loopback restore database. They do not accept live connection strings. The restore script refuses nonempty target tables, executes validated COPY data only, excludes migration history and retains private diagnostics under ignored `.local-test-db/`. Foreign-key triggers are disabled only in the isolated COPY transaction and the separate verifier checks restored relationships read-only. Do not use these scripts as a production restore procedure.

Private backup files, the test cluster and build copies are ignored and excluded from commits. User temporary files are also left unstaged. Both repositories remain on local `codex/audit-safety-20260929`; no push or deployment is authorized yet.
