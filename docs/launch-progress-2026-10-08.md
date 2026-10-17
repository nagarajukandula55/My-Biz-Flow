# Launch preparation — verified progress, 8 October 2026

**Release decision: not yet an all-modules launch approval.** Changes are local and tested against disposable data. No production deployment, shared-database mutation, price publication or schema change was performed in this pass. Existing unrelated working-tree changes remain present and require separate review before release.

## Completed in this resumed pass

- Dedicated employee attendance login, owner-issued/reset/disabled credentials, forced first-password replacement, eight-hour signed sessions, password-reset revocation and active employee/business-module checks. Employees cannot access owner pages or submit attendance for a different employee.
- Database-backed login throttling (five attempts per fifteen minutes), fresh location readings, precise-location validation, office geofence checks and a browser-installable attendance entry point. No face images are collected; facial recognition remains unavailable as agreed with the user.
- HRMS reporting-manager and leave-balance tenant scoping, module/trial write checks, concurrent leave approval protection and valid payroll amounts/periods. Finalized/paid payslips cannot be overwritten or reopened. Notifications run after commit.
- Rental preparation/cleaning buffers, a scheduled maintenance window, inactive-asset enforcement, duplicate asset-name checks and legacy booking preservation on rename. Reservation and policy changes share one transaction lock. Conflicts use a bounded first-match query.
- Repeat rental returns retain their original settlement; returned bookings cannot be edited/deleted. Refundable balances are clearly labelled as calculations, not completed payments.
- Non-Service Centre mobile navigation disclosure, wrapping action/banner rows, keyboard dismissal and preserved PWA metadata. The existing Service Centre shell remains on its original branch.
- Hotel core added: rooms, capacity/rates, reservations, check-in/out, rescheduling/extensions, housekeeping and guest folios. Reservation conflicts and duplicate receipt references are checked under a transaction lock. It has a public scope page and an inactive signup/private pricing proposal; it is not published.
- Admin Designer catalog refreshed to 352 registered partner pages, including Hotel and employee attendance/credential management. HRMS workspace settings link to employee access.

- Linked rental bookings reserve 2–20 distinct catalog assets atomically. Every line has its own quote, deposit, cancellation and return, with linked-item navigation and partial-return progress. Creation applies the entered price/rate/deposit per item; individual edits allow different prices afterwards. Conflicts or invalid assets roll back the entire batch. Linked records cannot be deleted. This does not implement quantity pools or a consolidated payment ledger.

## Verified evidence

| Check | Result |
| --- | --- |
| Main application offline safety tests | 49 passed, including the 87-file Service Centre baseline |
| Disposable PostgreSQL integration suite | 20 passed, including Hotel lifecycle/concurrency/folio isolation and rental batch rollback/concurrency/partial returns |
| Main production build | Passed using isolated environment settings |
| Main and Admin TypeScript | Passed |
| Admin catalog/signup tests | 6 passed in this pass |
| Module workspace HTTP checks | 100 pages across 25 non-Service Centre internal modules; 25 cross-tenant redirects passed; five additional Hotel route variants rendered |
| Public directory/business pages | Directory and 25 detail pages rendered; GST alias and unknown-type behavior passed |
| Employee portal HTTP checks | Private identity, forced password replacement, owner-route denial, cross-business isolation, revocation and install manifest passed |
| Final phone/device visual acceptance | Pending: browser runtime fails to start with a sandbox setup error |

Earlier public-page browser checks covered 24 detail pages at 320/390/768 pixels. Those do not certify the newer signed-in shell or employee portal. Server-rendered HTTP checks do not simulate physical GPS, camera permissions, on-screen keyboards or native WebViews.

See [9 October continuation](launch-progress-2026-10-09.md) for newer HRMS, rental and browser-validation progress.

## Remaining launch work (8 October snapshot)

1. Finish phone/tablet/browser acceptance for every enabled business workflow, including location denied/inaccurate, employee password setup, rental maintenance errors and returned-record controls. Preserve separate regression coverage for live Service Centre users.
2. Hotel core is now implemented locally. Independent staff roles, OTA/channel synchronization, online payments, statutory reporting/tax invoices, multi-property/group/split-billing and guest identity-document workflows remain absent. Keep signup inactive until scope and staging/device acceptance are complete.
3. Rentals now supports linked multi-asset bookings and partial returns. It still needs quantity pools, per-line pricing during initial checkout, consolidated order amendments/payments, partial pickup fulfilment, inspection attachments, specialist vehicle/lease workflows, actual deposit/payment/refund reconciliation and multiple maintenance windows. Ten category labels do not establish end-to-end specialist coverage.
4. HRMS still needs assigned-office/work-mode policies, attendance corrections/audit, street-address lookup and fuller attendance-to-payroll policy. Face verification requires a provider; the user chose to defer it. Native Android/iOS projects remain unbuilt.
5. Accounting/GST is combined in the commercial proposal, not migrated for existing accounts. Complete invoice/journal/tax reconciliation acceptance and review all draft prices before catalog publication.
6. Complete provider sandbox acceptance for payments, delivery and Telegram, recovery rehearsal, and staging smoke tests. A passing local suite does not prove provider configuration or production data readiness.
7. Shared-database/catalog activation remains a human-run release operation under the repository's database-safety rules. No current draft prices or inactive signup offerings were published.

See [business scope and industry review](business-expansion-2026-10-08.md) and [pricing proposal](module-pricing-2026-10-07.md) for the detailed limits and recommendations.
