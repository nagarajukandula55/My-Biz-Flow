# Launch preparation — 11 October 2026

This report supersedes the remaining-work lists in the 8–9 October reports. Work remains local and unpublished; no production database mutation, migration, price publication or deployment was performed.

## Agreed launch scope

- Mobile-ready web first. Native Android and iOS applications follow later.
- Platform Razorpay and its payment records belong only to SaaS subscriptions. Partner customer payments remain their own business transactions.
- Partner workflows record Cash, Manual UPI, Card, Bank transfer and Other manual payments. Optional business UPI instructions are independent of subscription checkout. No business gateway connection, transfer or bank verification is implied.
- Existing Service Centre behavior remains protected. Facial attendance remains deferred because no provider was selected.

## Implemented in this continuation

- Rentals: pooled stock and booking quantities up to 10,000 units, concurrency-safe peak availability, turnaround buffers, overdue holds, safe capacity reductions and atomic multi-asset reservations. Legacy quantities default to one. Maintenance blocks the full pool; pickup/return covers the whole booking line. Paid/collected quantities cannot be changed.
- Rentals: immutable payment-record corrections with original receipt, correction reason and owner attribution. Dependent refund/damage checks prevent invalid balances. Duplicate references and corrections remain protected. Manual payment methods are recorded separately from payment type.
- HRMS: attendance-derived payroll drafts for completed months, configurable working weekdays/holidays, explicit owner-reviewed paid-leave credits and retained calculation evidence. Finalization is blocked if attendance, approved leave or amounts changed; recalculation is required. Attendance corrections, leave decisions and finalization share compatible locks. No statutory payroll filing is claimed.
- HRMS: explicit links to view recorded punch coordinates on maps; no fabricated street address or automatic third-party geocoding.
- Hotel: atomic groups of 2–20 distinct rooms, linked independent room histories, separate room folios and a fixed two-payer allocation. Per-payer receipt/refund limits and zero-balance checkout are enforced. Allocation freezes after financial activity; extensions add room charges to Guest. Folios are not statutory tax invoices.
- Accounting: owner-only Billing reconciliation, 50 invoices per page, exact invoice/journal linking after amount and date checks. The report detects missing/duplicate links, changed totals, foreign accounts and incorrect revenue/tax/asset allocation. It does not automatically post journals or certify GST filings, rates, credit notes or collections.
- Payment settings: valid optional business UPI instructions are available to relevant non-Service Centre modules. Hidden fields are preserved; existing Service Centre settings cannot be overwritten through this action.
- Recovery: a strict localhost-only synthetic dump/restore rehearsal passed with matching tenant/record checksums and restored constraints. It creates and removes uniquely named test databases; it does not validate an actual production backup.

## Verification

- 67 offline safety tests passed, including the 87-file Service Centre preservation check.
- 32 isolated PostgreSQL integration tests passed, including contention, rollback, tenant isolation, stale payroll, pooled stock, payment corrections and split folios.
- Combined TypeScript passed after correcting two rental quantity column definitions.
- The combined production build passed. HTTP checks passed for 100 workspace pages, 25 cross-business restrictions, public directory plus 25 detail pages, employee login/identity/revocation, and the changed operational routes. Invoice reconciliation requires Billing alongside Accounting; the missing-module message and enabled report were tested.
- At 390px, browser tests saved a manual UPI rental receipt and immutable correction, allocated a Hotel stay between two payers and recorded a company cash receipt, and created an attendance-derived payroll draft. Balances and retained history matched expectations; those screens had no document overflow or duplicate field IDs. The Starter payroll upgrade gate was also verified before a private synthetic Pro plan exposed the form.
- Reconciliation fits the narrow 320px requested viewport (browser reports 321px). Browser testing found a logo file-picker overflow in Settings; the fix is scoped to non-Service Centre workspaces. The final production rebuild passed and the loaded Settings/payment instructions recheck showed 311px document width inside the 321px viewport, with no overflowing elements.
- Designer catalog contains 353 registered definitions; static module audit reports no missing imports or definitions.

## Remaining release work and explicit limits

- The checks above cover selected critical paths, not every possible device/workflow combination. Final build and selected mobile acceptance are complete.
- Rental inspection attachments/signatures, movement corrections, delivery routing and consolidated amendments remain outside the implemented workflow. Partial fulfilment is now implemented as detailed below; no automatic price proration is applied.
- Hotel staff roles, multiple properties, OTA connections, statutory guest reporting/tax invoicing and more than two payers remain unavailable. Room moves are now implemented as detailed below.
- Payroll statutory deductions/filing and automatic street-address lookup remain unavailable. Physical GPS/device acceptance still requires real devices.
- GST filing acceptance still needs accountant review. Journal reversals and credit-note/payment-to-ledger matching are now implemented as detailed below; matching recorded amounts is not full accounting/GST certification or automatic posting.
- Actual staging/provider acceptance and recovery from a production backup have not been completed. Publishing signup/prices and production deployment remain pending release approval and verification.
- Native mobile apps and optional partner-owned payment integrations are follow-up scope under the user's clarification.

## Resumed local validation and completed fixes

The existing disposable PostgreSQL cluster was confirmed running at `127.0.0.1:55439`, using `.local-test-db/data`. This is the database used for these checks; the live Service Centre database was not used.

- Rentals now supports immutable partial pickups, returns and release of uncollected units. Each entry records quantity, reference, owner and inspection/release notes. Damage accumulates and final settlement closes only when all units are accounted for. Legacy endpoints cannot bypass the partial movement ledger. Availability retains promised booking windows and holds overdue outstanding units through return/preparation. No automatic price proration or movement correction is claimed.
- Hotel room moves preserve agreed charges, payment allocations and history. Tenant ownership, stale source-room submissions, guest capacity and destination availability are checked under the reservation lock. In-house moves mark the old room Dirty. The destination must be free for the full original stay dates.
- Accounting supports audited, idempotent equal-and-opposite journal reversals in an open period while preserving originals. Invoice, credit/debit note and payment matching checks recorded dates, allocations and ownership. Reversed linked journals are flagged for review. These workflows neither transfer funds nor submit tax returns.
- Admin now includes Hotel in its module selector and readiness profile. Both applications contain the same 26 module slugs. Plan writes reject unknown/duplicate module selections, invalid prices, limits and billing cycles. String `"false"` no longer enables public pricing. Publishing remains a manual authenticated-admin action.
- CI now uses the same explicitly isolated database port required by its tests and runs HTTP page/authentication acceptance after the production build. `scripts/run-isolated-http.cjs` refuses deployment environment files, inherited provider credentials and an occupied test-server port.
- Combined results: **71 application safety tests, 38 disposable PostgreSQL tests and 24 Admin safety tests passed**. Admin TypeScript passed. Service Centre preservation still covers 87 protected source files. Designer export remains 353 definitions; static coverage remains 26 modules / 344 pages with no missing definitions or imports.
- The synthetic local dump/restore rehearsal passed again, matching two tenants, three records, checksums and three restored constraints. This remains synthetic recovery evidence, not a rehearsal using an actual production backup.
- The combined production build passed, followed by HTTP acceptance for 100 workspace pages, 25 cross-business restrictions, employee authentication/revocation and all 25 public business detail pages.
- At 390px, browser acceptance recorded pickup of two of three rental units, one damaged return, release of the uncollected unit and the final return. The final ledger showed two returned, one released, none outstanding and ₹25 damage. A Hotel room move retained ₹2,000 agreed charges and its move history. A ₹100 journal reversal showed opposite lines, retained the original and removed further editing. Each checked document width was 380px inside the 390px viewport.
- Browser testing found that changing reconciliation tabs retained the previous document type in the client form. A form key now resets its state when the type changes. The final rebuild passed and browser navigation correctly selected credit/debit notes, payments and invoices in turn.
- Admin's isolated production build also passed compilation, lint/type checking, all 96 static pages and build traces. It used only the disposable loopback database and dummy integration values. The build emitted non-fatal Edge-runtime compression warnings from `jose` through Admin authentication; deployed authentication still requires release-environment acceptance.
- Temporary synthetic browser records were removed after acceptance. No deployment, signup publication, live pricing update or shared database mutation was performed.
