# Platform and sign-up readiness — 6 October 2026

**Decision: not ready to declare all modules live end to end.** This review covers the current My-Biz-Flow and My-Biz-Flow-Admin working directories, including existing uncommitted changes. It is an implementation/catalog audit with fresh automated checks, not a completed browser acceptance run for every business.

## Verified today

- The partner registry contains **25 modules and 337 module page files**. All 25 entry routes exist; all those pages contain Designer definitions. Three pages are missing their central Designer imports.
- A database-enforced read-only transaction inspected business-type and plan configuration, without reading customer records. There are **19 active business types**. **23/25 modules** occur in at least one active type's default module bundle, but only **19/25 have their own same-named active sign-up type**.
- **Brand and Accounting/GST are absent from every active default bundle.** Inventory, Accounting, HRMS and Marketplace are bundled under other types but have no standalone active type. A bundled module is not the same as a standalone business choice.
- Billing and Loyalty/Rewards have **no linked plans**. Their trial registration can exist, but the subscription page selects plans only from those links; their purchase/upgrade path is incomplete.
- Both projects pass fresh TypeScript checks. Partner offline safety checks: **27 passed / 7 failed**. Admin offline safety checks: **21 passed / 0 failed**.
- Disposable PostgreSQL integration checks were attempted at the explicitly isolated local endpoint; that database was unreachable. They do not provide a fresh passing result. No production integration writes were attempted.
- No fresh production build, deployed-browser acceptance, real payment, outbound provider delivery, or recovery rehearsal was completed in this review. Earlier release notes are historical evidence, not current certification.

Evidence: [read-only catalog snapshot](signup-catalog-audit-2026-10-06.json), [current route coverage](module-coverage.json). Re-run the catalog read with `node scripts/audit-signup-catalog.cjs`; it performs only a read-only transaction and writes a local report. Its result reflects the database configured in this checkout, not independent proof that every deployed environment uses that database or code revision.

## Confirmed blockers and implementation risks

| Priority | Finding | Evidence and required correction |
|---|---|---|
| P1 | Sign-up does not expose all 25 modules independently | Add/review active types for brand, accounting-gst, inventory, accounting, hrms and marketplace. Set valid bundles, linked public plans, page tiers and onboarding fields; verify with a fresh account per type. Existing seed files are proposals, not proof they ran. |
| P1 | Billing and Loyalty have no purchase ladder | Link reviewed plans in Admin. Verify trial access, plan selection, payment acceptance and expiry for each. Do not invent or silently replace prices. |
| P1 | A paid-plan module can remain invisible | Service Centre's PLAN-ULTIMATE includes accounting-gst, but its defaultModules omits it. `src/lib/designer/entitlements.ts` intersects defaultModules with active keys; `issueDefaultModuleAccessKeys` only issues keys for defaults. Payment acceptance activates the subscription without provisioning that additional module. Reconcile the commercial bundle and module grants before advertising the inclusion. |
| P1 | Sign-up provisioning is not atomic | `src/lib/partnerData.ts:createPartner` commits the partner before `assignOwnerRole` and `issueDefaultModuleAccessKeys`. Either later failure can leave a partially configured account. `src/app/signup/actions.ts` maps any creation/provisioning exception to contact_taken. Make provisioning transactional or reliably resumable, with accurate errors and retry tests. |
| P1 | Sign-up action does not enforce the public picker restriction | The page rejects missing/inactive types, but `registerBusiness` does not reject a missing/inactive result from getPartnerType before createPartner. Validate the type at the mutation boundary. Required custom fields are checked for presence, but select membership and numeric validity also need server validation. |
| P1 | Partner numbering is vulnerable to collisions | `nextPartnerId` uses count + 1 without a counter lock or serializable retry. Concurrent registrations may calculate the same ID; deleting a historical record can also make count + 1 reuse an occupied number. Use a durable, concurrency-safe allocation method and test retries. |
| P1 | Booking checks and writes are separate | Clinic appointment creation, Rentals agreement creation and Event resource booking check availability before an independent create. Source inspection identifies a race: concurrent requests can both pass. Require locking/constraints and concurrent overlap tests. This is a code-level risk, not a reproduced production incident. |
| P1 | Event venue conflicts are not covered by the resource check | `eventBooking.ts:checkResourceConflicts` examines resource allocations and returns immediately for no resources. It does not check venueId, so selecting the same venue without resources has no venue-overlap protection in this creation path. Add venue availability validation and concurrency protection. |
| P1 | Loyalty concurrent balance updates can disagree with the ledger | `loyaltyRewards.ts:earnPoints/redeemPoints` read a balance before the transaction and later write absolute balances. Two calls can use the same initial balance; transactions alone do not prevent lost updates or duplicate redemption. Use locked/conditional balance updates, transaction-scoped validation and tests. |
| P2 | Designer coverage and Admin evidence are stale | Missing imports: telecalling/wallet/page, inventory/stock/[recordId]/edit/page, inventory/stock-adjustments/[recordId]/edit/page. The exported partner catalog also fails its freshness check. Regenerate both partner and Admin release catalogs after correcting imports. Admin's current passing tests validate its saved snapshot, not current partner source freshness. |
| P2 | Approval configuration contradicts sign-up behavior | field-force and telecalling have requiresApproval=true in the database; the public action deliberately bypasses that flag. This is an explicitly documented product choice in code, so do not reinstate approval silently. Align Admin wording/configuration with the intended self-service behavior. |
| P2 | Onboarding instructions are inaccurate | /signup/[type] promises a one-time password and manual sign-in, while the action automatically signs in and redirects to set a password. Update the page copy to the implemented flow. |
| P2 | Readiness controls are largely checklists | Admin moduleReadiness marks workflows, dashboards and settings as Review required. Listing expected KPIs or settings is not evidence of a working dashboard/editor or business acceptance. Store dated acceptance evidence against each package and tier. |

## Every module: implemented surface and remaining acceptance

All rows below remain **not certified end to end**. “Direct” means a same-named active business type exists in the inspected database; “Bundled” means available in at least one other active default bundle. Pages and source structures establish feature presence, not correctness of every operation.

| Module | Pages | Sign-up | Implemented surface reviewed | Must verify or complete before broad launch |
|---|---:|---|---|---|
| POS | 9 | Direct | Checkout, sales, staff login, returns, till, reports, receipt | Fresh staff access; sale to stock/invoice; split tender; refund and till reconciliation; repeated-SKU return allocation policy. |
| Service Centre | 45 | Direct | Inquiries, workorders, masters, parts/PNA, estimates, invoices, payments, reports | Existing-user regression; inquiry to paid closed job; parts reversal; customer tracking; Ultimate GST entitlement mismatch. |
| Billing | 54 | Direct; plans missing | Contacts, items, invoices, payments, credit notes, quotations, proformas, challans, expenses, recurring invoices and reports | Link plans; invoice/payment/credit lifecycle; correct numbering and taxes; duplicate callbacks; recurring-job retries; complete document acceptance. |
| Brand | 8 | Missing | Brands, locations, location editing and rollup helper | Standalone sign-up; actual partner/location linkage; visibility boundaries and accurate consolidated metrics. |
| Clinic | 8 | Direct | Patients, appointments, consultation/prescription and billing helpers | Concurrent doctor booking protection; consultation to invoice/payment; patient isolation; reschedule/cancellation and document acceptance. |
| AMC / Field Service | 5 | Direct | Contracts, visit lifecycle and contract document | Scheduling, dispatch, completion, renewal and billing; overdue visit handling and actual notification delivery. |
| Restaurant POS | 6 | Direct | Orders, tables, table cart and lifecycle actions | Table order to KOT to settlement; cancellation/void; kitchen/receipt workflow; tax and inventory integration. Some Designer descriptions still incorrectly describe old demo behavior. |
| Subscriptions / Membership | 7 | Direct | Plans, subscribers, payment, freeze/resume and check-in helpers | Renewal/expiry, duplicate payment, month boundaries, freezes and check-in restrictions; reminders. |
| Real Estate | 8 | Direct | Property records and lead/deal lifecycle | Lead to visit to agreement; assignment, cancellation, document and billing linkage. |
| Rentals / Booking | 7 | Direct | Assets, rental agreements, return/deposit/damage lifecycle | Atomic availability; date validation; returns, overdue charges, deposit refund and invoice settlement. |
| Education / Coaching | 13 | Direct | Courses, batches, students, enrollments, fee/attendance helpers | Complete enrollment to installment/payment to attendance; batch assignment, fee balance and report consistency. |
| Manufacturing | 10 | Direct | BOMs, work centers, production orders, stages and stock policy | Material consumption and finished output; failure rollback; per-unit versus per-order BOM quantities; yield/waste and costing acceptance. |
| Wholesale / Distributor B2B | 11 | Direct | Customers, price tiers, orders, credit checks | Pricing to credit approval to fulfilment/invoice/payment; concurrent credit-limit enforcement; paginate the unbounded order list. |
| Logistics / Fleet | 10 | Direct | Vehicles, drivers, trips, assignment and delivery stages | Assignment conflict rules; delivery success/failure, proof and billing; maintenance/fuel needs require a defined business scope. |
| Legal / Case Management | 9 | Direct | Clients, matters, documents, engagement letters and billing-related workflow | Matter to document/time/fee workflow; access to sensitive files; deadline and billing acceptance. |
| Event / Venue Booking | 11 | Direct | Calendar, venues, resources, bookings and payment helper | Venue-overlap checks; atomic resource booking; rescheduling/cancellation; deposits, balances and refunds. |
| Salon & Spa | 7 | Direct | Service menu, appointments and lifecycle | Stylist availability, service duration, completion/payment, cancellation and repeat-customer workflow. |
| Telecalling | 9 | Direct | Leads, agents, agent queue/login, call outcomes, templates and wallet route | Register wallet in Designer; lead/agent permissions; follow-ups; WhatsApp/SMS acceptance and failure paths; align approval flag. |
| Inventory / Warehouse | 34 | Bundled: POS, Service Centre | Stock, warehouses, transfers, adjustments, stock take, parts/returns, BOM, consumption and ageing | Standalone sign-up; Designer edit imports; receipt through consumption/return; serial/condition rules, negative-stock prevention and reconciliation. |
| Accounting / GST | 11 | Missing | Return generation, dashboard, ITC and HSN views | Sign-up and paid entitlement; invoice-to-return reconciliation, export acceptance and document scope. Export screens do not establish government filing/e-invoice integration. |
| Accounting | 13 | Bundled | Chart of accounts, journals, fiscal periods, trial balance, P&L and balance sheet | Standalone sign-up; balanced postings, period close, payment/document linkage and opening balances; journal-list pagination. |
| Loyalty & Rewards | 4 | Direct; plans missing | Members, points ledger, earn/redeem and tiers | Link plans; correct concurrent earn/redeem; reversal/expiry requirements; configurable rules. Earn rate and tier thresholds are currently code constants. |
| HRMS / Payroll | 13 | Bundled | Employees, office locations, geofenced attendance, leave and payroll | Standalone sign-up; employee to attendance/leave to payroll/payslip; corrections, authorization and organization-specific pay rules. |
| Marketplace / Aggregator | 8 | Bundled | Listings, vendor settings, orders and order detail | Standalone sign-up; vendor boundaries; ordering, cancellations, commission and payout reconciliation; actual payment-provider acceptance. |
| Field Force | 17 | Direct | Customer/provider portals, catalog booking, dispatch, engineers, companies, allocation and wallet | New customer/provider onboarding; skill/pincode matching; dispatch to completion/payment/rating; authorization, failure/refund and notification paths. |

Bundled Accounting, HRMS and Marketplace occur under education, event-booking, legal, manufacturing and wholesale-b2b. This does not make those modules independently selectable at sign-up. Full mappings are in the catalog snapshot.

## Fresh test detail

The seven partner failures consist of:

1. Analytics test: unmocked telecalling/analyticsData dependency.
2. Delivery test: unmocked telecalling/whatsappGate dependency.
3. Payment acceptance test: unmocked env dependency.
4. Recurring-invoice authorization test: unmocked format dependency.
5. Subscription-expiry authorization test: unmocked format dependency.
6. Partner Designer catalog freshness mismatch.
7. Missing central page import (the test stops at Telecalling wallet; the complete static audit also found two Inventory imports).

The first five fail before verifying their intended assertions; they are stale test fixtures, not proof the underlying feature is broken or secure. Update mocks to the real contracts and retain behavioral assertions. The catalog/import failures are confirmed coverage drift. TypeScript passed in both apps, which does not replace behavior tests.

## What to add next

First complete access, provisioning, concurrency protection and test coverage for the existing catalog. Adding more verticals now would expand an already unverified release surface.

Recommended platform additions, based on this code review:

- A sign-up coverage view in Admin showing all 25 modules, standalone/bundled/missing status, plans and entitlement mismatches from live configuration.
- A per-business onboarding checklist that tracks company details, masters, staff, numbering, opening balances/stock, provider setup and a first successful transaction.
- A resumable registration process with explicit provisioning status and safe retries.
- An acceptance register recording module, business package, plan tier, owner/staff role, test date, code revision, evidence and failures. “Ready” should require evidence, not route presence.
- Consistent operational controls for failed jobs, duplicate requests, audit history and recovery; configurable business rules where they are currently constants.

Potential vertical expansion should follow customer requirements: restaurant kitchen/printer operations, rental asset condition and utilization, manufacturing costing/quality, fleet maintenance/fuel, or sector-specific reporting. These are scope candidates, not claims that all are absent or required by every business.

## Release acceptance requirement

For each offered business type and plan: register a fresh account; set its password; verify its modules and roles; create masters; execute a realistic sale/service/booking cycle; edit/cancel/refund; verify stock/ledger/tax/document totals where relevant; verify reports; reject another tenant and unauthorized staff; test trial expiry/upgrade; test retries and simultaneous operations; confirm external provider results; and rehearse recovery in an isolated environment. Include all the workflows in the matrix above.

The bounded checks in this review do not establish that every possible feature required by every business exists. A defined workflow checklist and a passing acceptance run per business package are necessary before making that claim.

## Changes made by this audit

Added a reusable read-only catalog audit and its dated output, refreshed the partner module-coverage report, and saved this review in both projects. Application logic, existing user changes, production configuration and database data were not changed. No deployment was performed.
