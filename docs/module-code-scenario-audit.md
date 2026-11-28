# MBF module code scenario audit

**Date:** 27 November 2026  
**Status:** In progress; no live-readiness sign-off  
**Scope:** 24 registered modules, excluding Service Centre, Restaurant POS, and Hotel.  
**Method:** Static source review of routes, UI handlers, server actions, data-access code, and lifecycle logic. No tests were run for this pass. This is not proof of production behavior.

## Cross-module findings

1. **Module access is not consistently enforced at the server boundary.** The shared partner layout checks the partner session and uses entitlements to shape the sidebar, but does not reject a direct URL because its module is absent from the visible-module list. Explicit `assertModuleAccess` was found in only Accounting, HRMS, and Rentals layouts among the in-scope module layouts. For example, Brand pages/actions use partner-scoped rows and verify the partner session, but do not check that Brand is enabled. Generic `businessRecordActions` also verifies the session without checking the target module entitlement. A hidden module can therefore remain reachable through a direct path/action. **Release blocker.**
2. **Plan-tier protection is mostly rendered in the UI.** Several pages use `renderTierGate`, while the generic write path only calls `assertPageTierAccess` for the POS-barcode-field case. Since Server Actions execute independently of the page render, every tier-gated operation needs its own server-side check. **Release blocker until traced and closed.**
3. **Trial-write protection is uneven across Prisma-backed modules.** Generic BusinessRecord writes call `assertPartnerCanWrite`; several bespoke Prisma data layers do not. Confirmed examples include Brand, AMC, Subscriptions, Real Estate, Education, Logistics Fleet, Legal, and Salon. Other modules have guards on some but not all operations. Expired-trial writes must fail before any partial side effects.

## Module-by-module first-pass review

Page counts are source `page.tsx` counts; they confirm routes exist, not that every workflow branch is complete. “Connected” means page source imports a data/action layer. Scenario review remains open unless stated otherwise.

| Module | UI/backend connection and first code findings |
|---|---|
| POS (10 pages) | Checkout/till/returns/reports connect to POS sessions, stock, sales, and Billing. Manager/staff gates and server-side totals/stock checks exist. Void/return leaves the paid Billing invoice unreversed; cash return can proceed without an open till and then is omitted from till reconciliation. |
| Billing (55) | Generic CRUD plus payments, documents, reports, recurring invoices, GST and exports are wired. Session and GSTIN checks exist in the shared action path; inventory invoices use a stock lock. Module/tier enforcement and refund/recurring retry branches remain open. |
| Brand (8) | Prisma Brand/Location CRUD is wired and partner-scoped. No module-key or expired-trial write guard in this data layer. Location status, mapping, and rollup edges remain open. |
| Clinic (8) | Prisma patients, appointments, prescriptions, and Billing link are wired. Appointment validation and overlap checks exist. Patient create/update lack the trial guard; invoice idempotency and all completion/cancel/no-show branches remain open. |
| AMC / Field Service (6) | Contract/visit pages, dispatch board, and lifecycle actions are wired. Dispatch trusts submitted technician identity/name; visit status/date are insufficiently validated; requests are not restricted by contract status; renewal is not atomic/idempotent under concurrent submits. |
| Subscriptions / Membership (7) | Plans, subscribers, check-in, freeze/resume and Billing invoice path are wired. Repeated/concurrent payment can create duplicate invoices and advance billing twice; plan paise are rounded to whole rupees in invoice creation. |
| Real Estate (8) | Property/enquiry CRUD and lifecycle fields are wired and object-scoped. Input/status/date relationships are not consistently validated; module/trial gates are absent in the data layer. |
| Rentals / Booking (7) | Assets, agreements, payments, fulfillment, and maintenance are wired. Module-key and trial guards exist on many writes and the layout gates the module; read/list and all multi-step payment/return branches still need tracing. |
| Education / Coaching (13) | Courses, batches, students, enrollment, fees and attendance are wired. Actions check owner session, but separate Prisma writes do not show module-key/trial guards. Capacity, fee adjustments/refunds, attendance correction and archival branches remain open. |
| Manufacturing / Production (10) | BOM, work centers and production connect to inventory helpers. Status/stock workflow is present, but module-key enforcement is not consistent. Shortage, partial production, cancellation/reversal and concurrent completion remain open. |
| Interior Design & Materials (6) | Projects/BOQs, controls, site updates and inventory are wired. Generic writes enforce trial policy; module entitlement is not consistently enforced. BOQ revisions, reservations, change orders and milestone billing remain open. |
| Wholesale / Distributor B2B (20) | Orders, dealer network, pricing, portal links, referrals, fulfillment and analytics are wired. Most actions check owner session; dealer portal has separate token flows. Module entitlement, referral eligibility, PO transitions, stock, payment and replay/expiry remain open. |
| Logistics / Fleet (10) | Prisma vehicles/drivers/trips and actions are wired; assignment checks same-tenant active driver/vehicle. Delivery stage update does not enforce a legal transition sequence; invalid Delivered proof silently returns. Module/trial write gates are absent in the data layer. |
| Legal / Case Management (9) | Prisma clients, matters, court dates, documents and notifications are wired and scoped by partner. Module/trial gates are absent in the data layer. Close/reopen, deadline, document, reminder retry and billing flows remain open. |
| Event / Venue Booking (11) | Venues/resources/bookings, calendar, payments and alerts are wired. Server-side resource/time conflicts and partner trial guard exist. Payment can exceed total due; edit can reduce paid amount without refund/reversal. Module access gate remains open. |
| Salon & Spa (7) | Service/appointment tables and Billing invoice link are wired. Service validation, stylist overlap checks and serialized invoice creation exist. Prisma writes lack expired-trial enforcement; appointment completion can persist before invoice creation is denied. Module access remains open. |
| Telecalling (9) | Agent login/queue, leads, templates, SMS/WhatsApp and wallet services are wired. Separate staff authorization and provider-result handling exist. Module enablement, tier checks, bulk-import partial failures, reassignment, opt-out/retry and billing remain open. |
| Inventory / Warehouse (42) | Stock, lots, procurement, barcode, offline queue, and locks are wired. POS-only barcode checks exist. Module entitlement is not consistently enforced by the layout/shared action boundary; tier checks and stock/import/offline/reversal branches remain open. |
| Accounting / GST Compliance (11) | GST/ITC pages connect to generic BusinessRecord CRUD and GST/export helpers. No module-key check found in its layout/shared CRUD boundary. Direct action submissions and GST/ITC/export cases remain open. |
| Accounting (16) | Ledger, journals, chart, periods, reports, and reconciliation connect to Prisma services. Layout/data layer enforce module access; most actions check owner session. One action file needs caller-level authorization tracing. Posting/reversal/closed-period and reconciliation remain open. |
| Loyalty & Rewards (4) | BusinessRecord forms connect to loyalty services/rules. Generic action supplies session/trial guards, but not module entitlement. Earn/redeem caps, expiry, refunds and idempotency remain open. |
| HRMS / Payroll (15) | Employee access, attendance, leave, payroll and locations connect to dedicated services. Module layout and many data functions enforce module access; some actions need separate session tracing. Payroll approvals/adjustments, retroactive attendance, leave overlap and self-service remain open. |
| Marketplace / Partner Aggregator (8) | Listings, orders and vendor pages connect to BusinessRecords and notification helpers. Actions generally check owner session; generic writes enforce trial policy. Module entitlement, vendor/customer authorization, cancellation/refund and payment/stock reconciliation remain open. |
| Field Force (20) | Customer/provider onboarding, bookings, allocations, wallet and notification paths connect to dedicated APIs/services. Separate customer/provider sessions are present. Role boundaries, module/trial access, cancellation/refunds, allocation races, OTP lifecycle and payout reconciliation remain open. |

## Sign-off rule

Do not mark these modules live-ready until each flow has a completed UI-to-action-to-data trace, negative/failure branches are handled, server-side module/tier/trial authorization is consistent, and operational acceptance evidence is available. No source-code fix, migration, deployment, or production-data operation was performed in this review.

## Confirmed scenario-level findings (static review)

The items below are specific code paths inspected beyond the route/count inventory. They are source-level findings, not runtime reproduction.

### High priority, cross-module

- The shared partner layout builds navigation from enabled modules but does not enforce an entitlement before rendering every direct module URL. Only Accounting, HRMS, and Rentals had an explicit module gate in their module layouts in the inspected route set. This leaves direct navigation possible for disabled modules unless an individual action/data helper independently gates it.
- UI tier gates do not protect direct Server Action calls. The shared BusinessRecord action path only makes a page-tier check for POS barcode-specific fields. Restricted operations need matching server-side tier checks.
- Module-specific Prisma writes need consistent expired-trial checks. Several inspected modules write directly without calling `assertPartnerCanWrite`; this includes Education, Legal, Brand, AMC, Subscriptions, Real Estate, Logistics Fleet, Manufacturing, and Salon. Some flows have a guard in one layer but not another, so a multi-step flow can partially persist before a later step is denied.

### Confirmed module scenarios

- **POS:** sale void/return updates inventory and return records but leaves the linked paid Billing invoice unreversed. A cash return is accepted with no open till and stores a null till session, so it is absent from till reconciliation.
- **Clinic:** appointment validation and overlap locking are present; duplicate invoice creation is guarded by invoice linkage. Patient CRUD does not have the same trial-write guard as appointment writes. Full cancellation/no-show/completion/reopen branches still need complete trace.
- **AMC / Field Service:** dispatch accepts technician ID/name from the caller without proving that the technician is an active staff member for this partner. Visit status/date are not sufficiently validated; service requests are not constrained by contract status; renewal can be duplicated under concurrent submissions.
- **Subscriptions:** payment converts the plan amount from paise to whole rupees using rounding. Invoice creation and subscriber-period advancement are separate, non-idempotent operations, so retries/concurrent submission can produce duplicate invoices and advance coverage more than once.
- **Real Estate:** stage/status input is not consistently validated; site visit time checks use check-then-write without a lock, and malformed/missing visit fields can bypass conflict detection. Commission percentage has no 100% upper bound; close/lost reasons are optional.
- **Education:** the codebase has both a dedicated Prisma model path and older BusinessRecord enrollment actions. The older enrollment capacity check counts then creates without a lock/transaction, allowing concurrent enrollments to overfill a batch. The separate Prisma enrollment flow uses a batch lock, but course/student writes lack trial guards. These two paths need reconciliation so UI routes do not create inconsistent records.
- **Manufacturing:** stock consumption and finished goods are performed transactionally on completion, but completion does not require a QC stage; status actions permit jumps among stages. BOM line material/quantity inputs and work-center capacity need stronger server validation.
- **Logistics / Fleet:** driver/vehicle same-tenant active checks exist. Trip delivery stages can be set out of sequence; Delivered without recipient silently returns, and Failed does not require a failure reason.
- **Event Booking:** The initial review found uncapped payment additions, editable paid totals, missing module entitlement checks, and unguarded venue/resource writes. This pass adds the module/write guards, payment ceiling, and rejects payment-total edits outside the payment/refund flow. PostgreSQL regression assertions were added; they need to run against the disposable DB after these latest edits.
- **Salon & Spa:** service/stylist validation and invoice lock are present, but appointment completion is persisted before a later Billing create can be rejected for expired trial, leaving a completed but unbilled appointment. Prisma writes lack consistent trial guards.
- **Interior Design:** project status accepts known values but does not enforce legal transitions. Progress invoicing computes each invoice from the requested percentage and overwrites `billedTotal` / last invoice metadata; no cumulative cap or idempotency check was found. BOQ stock consumption checks and decrements lines one by one without a single transaction/lock, then records `stockConsumedAt`; concurrent attempts can oversell or partially consume stock. The invoice is created before the project update, so a retry can create another invoice.
- **Wholesale / Dealer:** core fulfillment has per-order locking, stock validation, serial/FIFO handling, relationship/subscription checks at receipt, and cancellation before shipment releases reservations. First-plan referral reward is based on a captured payment and transaction-scoped logic. Warehouse ID/name binding now resolves to an active partner-owned warehouse before allocation or receipt. Module/trial write gates were added to wholesale data and fulfillment mutations. Full database end-to-end coverage for distributor/dealer lifecycle, credit-limit concurrency, payment retries, and relationship revocation is still absent.
- **Marketplace:** current implementation is a single-partner order/listing workflow; no cross-partner marketplace payout/settlement is implemented. Order mutation now enforces Pending -> Confirmed -> Shipped -> Delivered, disallows invalid jumps, handles idempotent status retries, serializes competing confirmations, and restores stock on Confirmed cancellation. The PostgreSQL regression suite passed both Marketplace cases in the user's latest 36/36 run.
- **Loyalty & Rewards:** ledger and running balance update transactionally with locking, and insufficient balance is rejected. Earn calls have no purchase/source idempotency key, so the same purchase can earn repeatedly. POS/Billing integration was not found in the inspected flow.
- **Telecalling:** manager/agent authorization and call outcome validation are present. CSV parsing is a simple comma split and does not handle quoted commas; import creates rows before assignment, so an assignment failure can leave imported leads partially unassigned. Agent create/status/password actions use only owner session rather than the module-specific manager authorization used by lead/template actions. Those actions need a permission consistency check.

## Audit completion status

### Route and generic action access follow-up

Every in-scope module now has a route template checking current visible entitlements. The shared layout also checks direct module URLs before print rendering. Generic BusinessRecord create, edit, and patch actions resolve module partitions to their owning module and deny disabled-module writes. The focused entitlement tests and TypeScript pass. Bespoke actions, standalone APIs, and direct Prisma writes still require separate checks; an enabled module's restricted page tier is not enforced by these module gates. Existing findings below describe the earlier source baseline and remain open where not explicitly addressed.

This remains an **in-progress code audit**, not a live-readiness certification. Route/UI/backend wiring was inventoried for all 24 in-scope modules, and the above scenario branches were traced for the modules listed. Remaining module-specific branches (notably Billing, Inventory, Accounting, HRMS, Field Force, Legal, Brand, and Rentals) need source-by-source negative-path tracing before claiming every yes/no scenario has been covered. No tests were run and no source files were changed as part of this review.

- **HRMS / Payroll:** Dedicated data functions enforce module access and trial-write checks; payroll period locks, Draft→Finalized→Paid progression, and protections against changing finalized/paid records are present. Leave decisions lock the employee/leave and reject non-pending requests and approved leave that conflicts with finalized/paid payroll. However, Server Actions generally authorize only the partner owner session (not an HR-specific role), so the intended staff/manager permissions need confirmation. Attendance/payroll calculation and all correction/reversal paths still need complete trace.
- **Field Force / provider wallet:** Provider withdrawal action derives provider identity from the signed-in provider session, checks the withdrawal feature flag, and does not trust a client owner ID. When the feature flag is off it explicitly reports settlement is manual. Live payout settlement is therefore not available through this path; module-wide customer/provider/engineer/Admin flow and wallet reconciliation remain unverified.
- **Accounting / GST Compliance:** Module layout is metadata-only and does not gate the route; it relies on the shared partner shell. This confirms the direct-route/module entitlement gap for this module. Backend CRUD uses generic business-record actions, so authorization must be enforced there per record type/module.
- **Inventory / Warehouse:** Its module layout is metadata-only and does not gate the route. Source inventory includes many operation-specific action files, so each stock-moving action needs its own entitlement, trial, tenant, lock, and inverse-entry trace; a single module-wide “connected” label is not sufficient for sign-off.

## Local verification run (27 November 2026)

- **In-scope non-database tests:** 118 passed, 0 failed, across 38 `*.test.cjs` files after excluding filenames for Hotel, Service Centre, and Restaurant. These tests provide useful coverage but do not exercise every module workflow end to end.
- **TypeScript:** `npm run typecheck` passed.
- **Lint:** `npm run lint` passed with existing `react/no-unescaped-entities` warnings, including in files outside the audit scope.
- **Deployment configuration:** `npm run check:deployment` failed because this environment does not provide `SUPER_ADMIN_SECRET`, `PARTNER_SESSION_SECRET`, or `NEXT_PUBLIC_SITE_URL`; it also reported review warnings for `CRON_SECRET` and `ADMIN_BRIDGE_SECRET`.
- **Production build:** `npm run build` failed in this restricted environment. Google Fonts fetches could not resolve `fonts.googleapis.com`; webpack also reported `EPERM` while creating a `.next/server/app/...` directory. This does not establish whether the build succeeds in the deployment environment.
- **Database integration suite:** not run. Docker Desktop's engine pipe returned permission denied. The bundled PostgreSQL binaries initialized a fresh local cluster, but the sandbox denied local TCP client connections (`10013`), so Prisma/psql could not connect. The temporary cluster and its files were stopped/cleaned; no production URL was used.

### Correction: database migration attempts after user started Docker

The user started the disposable `mbf-ci-db` container from their PowerShell session. From this agent's restricted shell, Docker CLI access remains denied. A first migration attempt from the repository set `DATABASE_URL` to localhost but left the schema's `DATABASE_URL_UNPOOLED` direct URL inherited from `.env`; Prisma selected the Neon host and returned `P1001` before applying any migration. A second attempt explicitly set and verified both URLs as `127.0.0.1:55439/ci`, then returned `P1001` because this agent environment cannot connect to the user's Docker port. No migration was applied. The user's container may still be running.

### User-host database test run follow-up

On the user's host, `mbf-ci-db` accepted connections and Prisma reported 58 migrations with none pending. The filtered PostgreSQL integration run reported 14 passing tests and 5 failures. Four failures were test-loader setup errors because accounting/HRMS now import `@/lib/listPagination`; the signup action also imports dealer referral modules not mocked by the fixture. Added explicit mocks for those dependencies in the affected integration test files. The modified CommonJS test files pass `node --check`. A rerun against the user's Docker database is still required; this agent shell cannot access that host's Docker pipe or localhost port.

### Integration rerun result

After adding the missing test-loader mocks, the user reran the filtered PostgreSQL suite against `mbf-ci-db`: **34 passed, 0 failed**. Together with the earlier in-scope safety run (**116 passed, 0 failed**), automated non-hotel/non-Service-Centre/non-restaurant coverage executed in this session is 150 passing test cases. The integration result confirms the selected database workflows only; it does not constitute full end-to-end coverage for all module screens and scenarios.

### Fixes added after the passing integration run

- Marketplace order writes now enforce module/trial access, validate listing/quantity inputs, serialize stock changes per listing, enforce Pending → Confirmed → Shipped → Delivered transitions, restore stock when a Confirmed order is cancelled, and make same-status retries idempotent. Added a PostgreSQL regression test for these cases and competing confirmations. **The database regression test has not yet been run.**
- POS cash returns now fail before sale/stock reads when there is no open till; the action gives an explicit error, and a unit regression test covers the fail-closed path. The POS unit file passes (8/8).
- `npm run typecheck` passes after these source changes. The full database integration rerun is still needed to verify Marketplace against PostgreSQL. The app remains not certified live-ready; other audit findings and untraced module flows remain.

### Marketplace regression rerun

The user-host rerun executed 36 database integration tests: 35 passed, including the Marketplace stock-transition/concurrency test; one failed only because the error-object assertion crossed the VM realm boundary in the test loader. Updated the test to compare the error strings instead of object prototypes. The corrected regression suite needs one final rerun.

### Latest local verification after Event Booking and Wholesale changes

- Re-ran all in-scope `*.test.cjs` files, excluding filenames for Hotel, Service Centre, and Restaurant: **118 passed, 0 failed** after adding the Wholesale warehouse/write-guard regression.
- Re-ran `npm run typecheck`: passed.
- The user-host PostgreSQL suite passed **36/36** after the Marketplace assertion fix. That database run predates the Event Booking payment guards, so those new PostgreSQL assertions still need a user-host rerun.

### Event Booking authorization and payment safeguards

- Added `event-booking` module-key checks to Event Booking read paths, and module plus trial-write checks to venue/resource/booking writes.
- Venue capacity and resource names now validate before writes.
- Creation rejects initial payments above the total; subsequent payments cannot exceed the remaining balance or post to cancelled bookings.
- Booking edits can no longer alter payment history, and cannot reduce the booking total below the amount already paid.
- The edit UI now makes recorded payments read-only; create/edit action failures return visible form errors instead of surfacing an unhandled server error.
- Added PostgreSQL assertions for disabled-module denial, overpayment, payment-history edits, and lowering totals beneath received payments. **These assertions need a fresh run against `mbf-ci-db` after this patch.**

### Wholesale warehouse and write authorization safeguards

- Distributor allocation and dealer receipt now resolve the selected warehouse ID to an active warehouse record belonging to that partner, and reject a submitted name that differs from the saved name before reading or moving stock.
- Wholesale catalog, customer, pricing, order, and payment reads check the `wholesale-b2b` entitlement; mutations also check the expired-trial write gate.
- Added a focused negative-path test for module denial, expired trial, unknown warehouse IDs, mismatched warehouse names, and valid saved warehouse selection. The focused test passes; typecheck, lint, and the full in-scope non-database suite pass. PostgreSQL end-to-end coverage for this lifecycle, credit-limit concurrency, payment retries, and referral scenarios remains a release blocker.
