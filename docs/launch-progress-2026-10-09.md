# Launch preparation — 9 October 2026

Superseded by [11 October continuation](launch-progress-2026-10-11.md), including pooled rentals, audited payment corrections, attendance-derived payroll, Hotel groups/split folios and the clarified web-first/manual-business-payments scope.

Release remains pending. This continuation changes local code and disposable test data only; it does not publish prices, enable signup offerings or deploy to live customers.

## Completed

- HRMS owner-managed employee policies: any registered office, assigned offices, or explicitly enabled remote/field attendance. Device location validation remains required. Policy changes are audited and each check-in retains its policy snapshot.
- Owner-only attendance corrections with required reasons, before/after audit history, stale-page conflict detection, shift-overlap checks, tenant isolation and finalized/paid payroll-period protection. Original device coordinates are retained.
- Attendance history pagination: 50 rows plus a next-page sentinel rather than loading 500 report rows. Invalid date filters fail without querying malformed dates.
- Rental creation supports optional deposit, fixed-quote and periodic-rate overrides for each additional catalog asset. Blank inherits the main amount; zero is explicit. Every line still receives server validation inside the atomic reservation transaction.
- Browser inspection found and fixed multi-select controls displaying IDs instead of supplied asset/office names. Submitted IDs remain unchanged. Service Centre does not supply these option labels in its pages; its protected-file checks pass.

## Verification

- 50 offline safety tests passed, including the 87-file Service Centre preservation check.
- 21 disposable PostgreSQL integration tests passed, including concurrent attendance correction, owner denial, office-policy enforcement, payroll protection and rental batch rollback/partial returns.
- TypeScript and the final isolated production build passed, including the label fixes and protection of intermediate payroll months.
- Browser access recovered. Synthetic browser checks saved a two-item rental with prices ₹1,000/₹150 and deposits ₹500/₹0, and saved an audited attendance correction. Labels, IST date formatting, unset refunds and narrow-screen action wrapping were corrected and rechecked. The rental detail fits narrow phone (320px requested, 321px reported) and 768px tablet viewports without document overflow; menu navigation, employee policy and employee login were checked at 390px. These checks do not certify all modules, physical GPS behavior or native apps.
- Final HTTP checks passed: 100 workspace pages across 25 non-Service Centre modules, 25 cross-business redirects, five Hotel route variants, three HRMS policy/correction/filter routes, and employee login isolation/revocation/manifest checks.

## Still outstanding

Rental quantity pools, inspection attachments/signatures and external bank/payment reconciliation; HRMS address lookup and attendance-driven payroll policy; advanced Hotel workflows and external integrations; Billing-to-ledger/GST reconciliation acceptance; broad device/staging/provider acceptance and recovery rehearsal; native Android/iOS applications. Face recognition remains deferred as agreed.

## Further continuation: rental payment records

- Added owner-only, tenant-scoped manual rental/deposit/damage receipts and rental/deposit refunds on the booking detail screen. This records completed payments; it does not charge a gateway, transfer money, or verify a bank statement.
- Refund balances use recorded receipts, never an assumed paid contractual deposit. Partial deposits, damage retention, additional damage due and cancelled rental refunds have separate balances. The existing contract calculation is labelled accordingly.
- Unique receipt references make identical retries idempotent and reject changed duplicates. Booking locks prevent simultaneous refunds from exceeding the available balance. History is retained; paid bookings cannot be deleted, reassigned, repriced or reopened after cancellation.
- Each booking has a bounded history of 1,000 entries. Rental refunds currently require cancellation. Deposit receipts must be reconciled before recording additional damage payments. Payment corrections and automated bank/gateway reconciliation remain follow-up scope.
- Validation: TypeScript, 51 offline safety tests (including Service Centre preservation) and all 24 isolated PostgreSQL integration tests passed. New tests cover double-submit receipts, competing refunds, tenant/owner denial, partial deposits, damage retention, cancellation refunds and retained financial history.
- The isolated production build passed with the payment workflow. HTTP checks verified the payment controls plus 100 workspace pages and 25 cross-business restrictions. Final contract-versus-received-deposit wording was additionally type-checked after the build snapshot. This continuation did not repeat physical-device or browser interaction acceptance for the new payment form.

## Further continuation: rental operations and accounting

- Rentals supports up to 100 additional maintenance windows per physical asset, alongside the original editable maintenance period. New reservations and preparation buffers respect all scheduled windows. Adding a window checks existing reservations under the same booking lock; owners can remove a selected window.
- Item pickup records retain recipient, condition notes, optional handover reference and timestamp. Each linked item is collected independently. Retries preserve the original evidence; collected items cannot be deleted, cancelled or reassigned to another asset/renter/start time. Returns retain the pickup record. No photo upload or electronic signature is implied.
- Inactive assets cannot be handed over. An overdue Ongoing item blocks further bookings until returned; a booked end time is not proof the physical asset has come back.
- Accounting mutations require module/write entitlement and use one tenant-specific ledger lock. Journal posting/editing and fiscal closing are serialized. Lines must be non-negative integer paise, balanced, and reference active accounts in the same business. Account hierarchies reject foreign parents and cycles; an account with journal activity cannot change type.
- Journal replacement is atomic and rollback-tested. Closed-period checks cover the final day. Legacy foreign account relationships do not expose another business's account names.
- Trial balance now uses two queries (accounts plus grouped totals), replacing one aggregate query per account. The balance sheet includes a report-only unclosed profit/loss row, so income/expense activity reconciles with equity without creating a journal entry.
- Validation: 23 PostgreSQL integration tests and 50 offline safety tests passed, including fiscal-close contention, account isolation, journal rollback, report reconciliation, multiple maintenance windows, partial pickup and overdue-asset protection. Final production build passed. Expanded HTTP checks passed for 100 workspace pages, 25 cross-business restrictions, two rental operational screens, four Accounting journal/report screens, three HRMS screens and five Hotel screens. A Starter test account was verified to receive the upgrade gate; private synthetic Pro entitlement then exposed the reconciled reports. Browser acceptance at 390px saved a maintenance window and verified no duplicate field IDs or document overflow.

See the [previous launch report](launch-progress-2026-10-08.md) for the wider implemented scope and release constraints. This report supersedes its remaining-work statements for HRMS office policies/corrections, rental initial per-item prices and browser-tool availability.
