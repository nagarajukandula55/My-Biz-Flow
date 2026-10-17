# Business coverage and expansion — 8 October 2026

Implementation status is superseded by the [11 October launch report](launch-progress-2026-10-11.md): pooled rental quantities, payment corrections, attendance-derived payroll, Hotel groups and two-payer folios are now implemented. Native apps follow the mobile-ready web launch; business customer payments remain separate from platform subscriptions.

This review separates working code, changes verified locally, and future product work. It does not certify every sector end to end. No production account, price, schema or deployment was changed. The live Service Centre remains protected.

## Accounting and GST: one business package

Combine them commercially as **Accounting & GST**, with `accounting`, `accounting-gst` and `billing` in its new-account bundle. The draft monthly rates are ₹399 / ₹799 / ₹1,499 before tax. This replaces the two separate proposed offers; it is not an additional charge on existing subscriptions.

Retain the internal modules, journal tables, GST records, URLs and access keys. Accounting owns the general ledger and financial statements; GST owns return preparation, ITC and HSN views. Combining a signup type does not automatically reconcile every invoice/payment to journals or implement government filing. Those integrations need transaction acceptance before being advertised.

The private release proposal now contains 24 non-Service Centre packages covering 25 internal modules, including the new Hotel package. Including Service Centre gives 25 business packages covering 26 internal modules. Existing businesses and their bundles are not migrated. The public GST information URL redirects to Accounting & GST; existing signed-in GST routes are unchanged.

## HRMS: what is actually available

| Requirement | Finding |
| --- | --- |
| Live check-in/out | Owner-operated attendance remains available. A dedicated employee portal now derives the employee identity from a signed, revocable session and accepts only that employee's punches. |
| Coordinates at attendance | Browser latitude/longitude are stored for check-in and checkout. This records the device making the request; it does not independently establish employee identity. |
| Configurable geofence | Office name, latitude, longitude and radius are stored. Check-in is tested against the business's offices on the server. |
| Facial recognition | Absent. An unused photo URL column is not face verification. No enrolment, matching, liveness or biometric provider is implemented. |
| Street address lookup | Absent. Coordinates are not automatically converted into a postal address. |
| Continuous employee tracking | Absent. No background route history is collected. |
| Employee-only mobile attendance | Implemented locally using dedicated HrmsEmployee credentials linked to one employee. Owners issue/reset/disable credentials; first-login password replacement is mandatory. Final browser/device acceptance remains pending. |
| Shifts, breaks, corrections and payroll policy | Basic records exist; full configurable attendance-to-payroll rules and correction approvals remain incomplete. |

Fixes in this change: foreign-employee filters can no longer escape the business scope in attendance, leave or payslip lists; invalid coordinates and office radii are rejected; no-office check-in now fails with a setup message; simultaneous check-ins share a lock; overnight shifts remain open until checked out. The attendance screen obtains all open shifts in one query instead of one query per employee. Trial write protection applies to attendance and office changes.

Employee portal follow-up: dedicated credentials, employee binding, first-login password replacement, five-attempt/15-minute database-backed login throttling, password-reset session revocation, and active-employee/module checks are implemented. Browser location must be at most 60 seconds old and accurate within 100 metres. Sign-in is separate from owner/Telecaller/Service Centre sessions. No new schema is needed. Passwords are hashed; a temporary credential is displayed only once to the owner.

The user selected employee sign-in and geofencing first because no face provider is available. Update, 9 October: assigned offices/work modes and owner-only attendance corrections with before/after audit history are implemented. Supervisor-specific roles, street-address lookup and fuller attendance-to-payroll policies remain future work. For optional face attendance, add explicit enrolment, liveness, measured match thresholds, encrypted storage, retention/deletion controls and a non-biometric fallback. A browser GPS reading must not be presented as spoof-proof attendance. Record location at the punch; continuous tracking would be a separately defined feature.

Additional HRMS release fixes: all management pages require HRMS entitlement; writes check module and trial access; reporting managers and leave balances are tenant scoped. Concurrent approvals count leave once, and different approvals increment balances atomically. Payroll validates dates/amounts, only permits Draft → Finalized → Paid, and prevents overwriting finalized/paid payslips. Notifications follow transaction commit. Marking a payslip Paid records an administrative status; it does not transfer money.

Market reference: [Zoho People attendance](https://www.zoho.com/people/attendance-management-system.html?src=HRDocuments) distinguishes geofencing from its facial-recognition kiosk. Its [privacy explanation](https://www.zoho.com/people/privacy-policy.html) describes comparing attendance images with stored employee photos. This demonstrates separate capabilities, not an integration already present here.

## Rentals: shared engine with specialist workflows

Implemented in this change: ten rental categories; fixed, hourly, daily, weekly and explicitly 30-day pricing; server-calculated totals with partial periods rounded up; pickup/delivery, return/collection and cancellation terms. Terms save atomically with the agreement using the existing flexible record store. Existing agreements retain fixed-quote behaviour. Booking times are entered in IST. No schema change is required.

Further implementation: per-asset cleaning/preparation buffers (up to seven days), one scheduled maintenance window with notes, inactive-asset booking protection, duplicate asset-name checks and preserved booking identity on asset rename. Policy changes that conflict with existing future reservations fail with a message. Availability queries fetch only the first conflict. Asset configuration and bookings share the same transactional lock. Repeated return submissions preserve the original damage/refundable settlement; returned agreements cannot be edited or deleted. Linked bookings now reserve 2–20 distinct catalog assets together with atomic rollback and independent partial returns. Creation now supports separate price, rate and deposit overrides for additional items; blank overrides inherit the main amount. Update, 9 October: multiple maintenance windows and independent per-item pickup with retained condition notes are implemented. Actual payment/refund reconciliation, quantity pools, consolidated order amendments and inspection attachments/signatures remain outstanding.

These additions still book **one identifiable asset per agreement**. A category is not a complete specialised rental product. Use the following scope to expand systematically:

| Rental family | Specialist provisions still needed |
| --- | --- |
| Construction tools, machinery, generators | Meter hours, operator allocation, fuel, maintenance blocks, site movement and transport charges |
| Cars, bikes, trailers, RVs, boats | Driver/identity verification, vehicle inspection, mileage/fuel, insurance/excess, tolls and fines; jurisdiction-specific requirements need validation |
| Cameras, AV and computers | Serialized units, accessory kits, missing-item charges, condition photos and replacement value |
| Events, furniture, tents and linens | Quantity pools, multi-item orders, kit availability, crew, delivery/setup/collection and cleaning buffers |
| Clothing and costumes | Size variants, alterations, fitting appointments, cleaning/repair turnaround and item condition |
| Sports, outdoor and recreation | Time slots, equipment sizes, safety acknowledgements and weather cancellation policy |
| Medical and baby equipment | Cleaning/service history, accessories, delivery and inspection controls; no clinical suitability claim |
| Appliances and furniture subscriptions | Recurring invoices, renewals, swaps, installation, service visits and proration rules |
| Storage and commercial space | Unit capacity, occupancy, access dates, recurring rent, deposits and utilities |
| Residential leases, PG and hostels | Tenants/occupants, beds/units, calendar-month leases, escalation, utility allocation and move-in/out settlement |

Cross-cutting priorities: quantity-aware availability, multi-line orders, turnaround/maintenance blocks, quotation-to-contract, signature evidence, deposits and payment/refund reconciliation, partial pickup/return, extension conflict checks, delivery routing, invoices and asset utilisation reports. Keep asset reservations and payment retries atomic. Do not claim actual deposit refunds simply because a refundable amount was calculated.

[Booqable's industry catalogue](https://booqable.com/industries/) groups equipment, events, AV, vehicles, recreation and other rental uses, and distinguishes booking, contracts, inventory and payments. [Rentman's inventory workflow](https://rentman.io/solutions/inventory-management) adds kits, availability planning and subrenting. [Rent Centric](https://www.rentcentric.com/) demonstrates vehicle-specific fuel, odometer and tracking integrations. These inform the expansion list; our current category selector does not provide those integrations.

## Hotel management: core workspace implemented locally

Hotel was absent in the initial audit. A separate `hotel` module is now implemented using the existing tenant-scoped flexible record store, without a schema migration. It supports up to 500 uniquely named rooms, room types/capacity/nightly rates, Ready/Dirty/Out of service housekeeping, one-room guest reservations, rate snapshots, check-in/out, rescheduling/extensions and guest folios. Room and reservation writes share a transaction lock; duplicate payment references are idempotent. Checkout requires a settled balance and makes the room Dirty. Occupied rooms cannot be edited, and existing future reservations prevent incompatible capacity/out-of-service changes.

The four operational pages, workspace settings/summary/Telegram reporting, public detail page, Designer catalog and inactive signup/private pricing proposal are wired up. Draft monthly prices are ₹499 / ₹999 / ₹1,999 before applicable tax; tier differentiation still requires acceptance. These are scope-based commercial judgements, not claimed market discounts. [Hotelogix's official FAQ](https://www.hotelogix.com/faq) confirms room-count-dependent pricing, but no reliable numeric quote was verified in this review.

This initial Hotel workflow is owner-operated. Payments/refunds are manual records of external transactions; the folio is not a statutory tax invoice. OTA synchronization, online payments, multiple properties, room moves, group/split billing, guest identity-document management, statutory guest reporting and independent staff-role permissions are not implemented. It remains unpublished pending those scope decisions and device/staging acceptance.

The broader hospitality release checklist remains:

1. Properties, room types, physical rooms, occupancy capacity, rate plans, taxes and blackout/out-of-service dates.
2. Availability by room-night; enquiries, holds and reservations; deposits, cancellation/no-show rules; concurrent reservation protection.
3. Guest records, arrival/departure, check-in/out, extensions, room moves and identity-document handling with access controls.
4. Dirty/clean/inspected room states, housekeeping assignment and maintenance blocks.
5. Guest folios with room charges and extras; split billing, payments, refunds and end-of-day reconciliation.
6. Front-desk calendar, arrivals/departures, occupancy, room revenue and outstanding balances; separate front-desk, housekeeping and manager permissions.
7. Integration with existing Billing, Restaurant POS and HRMS only after cross-module reconciliation tests.

Follow with channel-manager/OTA and booking-engine integrations, rate restrictions, group reservations, travel-agent accounts, guest messaging and mobile housekeeping. Availability must update atomically across channels before claiming overbooking prevention. [Hotelogix's PMS scope](https://www.hotelogix.com/products/property-management-system) covers reservations, front desk, housekeeping, billing/reporting and connectivity, supporting the need for a separate operational model.

## Other industry gaps and how to approach them

This is a prioritised product-fit assessment, not an exhaustive economic-industry census or a market-size forecast. The [Odoo industry catalogue](https://www.odoo.com/all-industries) is a broad comparison for industry packaging; priorities below are our assessment based on reuse of this application's current modules and missing workflows.

| Priority | Industry / business family | Approach | Essential missing workflow |
| --- | --- | --- | --- |
| First | Hotels and hospitality | New vertical | Room-night inventory, stays, housekeeping and folios |
| First | Rental specialists | Expand Rentals | Quantity pools, multi-item fulfilment and asset-specific charges |
| First | PG, hostels, coworking and storage | Property/space extension | Bed/desk/unit occupancy, recurring rent and utilities; do not equate with short hotel stays |
| Next | Laundry and dry cleaning | New workflow using Billing/POS | Garment tagging, service stages, piece counts, delivery and claims |
| Next | Agencies, consultants and project services | Shared Projects capability | Projects, tasks, timesheets, milestones, budgets and project invoicing |
| Next | Construction and contractors | Projects + Inventory + Accounting | Estimates/BOQ, site materials, subcontractors, progress bills and retention |
| Next | Cleaning, pest control and facilities | Extend AMC / Field Service | Recurring job templates, inspections, proof of completion and consumables |
| Next | Travel and tour operators | New vertical | Departures, itinerary, traveller records, supplier bookings and cancellation settlement |
| Later | Pharmacy and healthcare retail | Specialist POS extension | Batch/expiry, controlled-item and prescription workflows, supplier returns; compliance needs separate validation |
| Later | Diagnostics and laboratories | New clinical workflow | Orders, sample identity/chain of custody, processing, result approval and report delivery |
| Later | Agriculture and produce trading | Specialist procurement/inventory | Weighing, grading, lots, season/yield records and settlement |
| Later | Nonprofits and associations | Billing/Accounting extension | Donations, restricted funds, donor receipts, grants and membership rules |
| Later | Automotive workshops and dealerships | Separate scoped extension | Vehicle inspections, estimates, service history, parts and warranty workflow; protect current live Service Centre |
| Later | E-commerce and omnichannel retail | Extend POS/Marketplace | Customer storefront, checkout, stock sync, shipping, returns and channel reconciliation |

Use configuration for businesses sharing the same operational model (for example, basic gym membership versus club membership). Create a separate vertical when the core unit and lifecycle differ (room-night/guest stay, laboratory sample, garment service order). Avoid inflating the module list with industries that only have a renamed form.

## Detailed business pages and mobile delivery

The new `/business-types` directory links to 25 detailed package pages including Hotel. Each explains the workflow, tool areas, setup/reporting, current limits, signup availability and mobile status. Accounting/GST has one canonical page. Links appear from signup and in the sitemap. Public pages read published configuration; private draft prices are not advertised. Hotel is marked as awaiting launch acceptance, with no active signup offer.

The new pages use a single-column phone layout, wrapping content and larger action targets, with wider grids on larger screens. Earlier browser checks covered 24 public detail pages at 320, 390 and 768 pixels without page overflow. Logged-in phone testing exposed a fixed sidebar squeezing the page; non-Service Centre workspaces now use an inline mobile menu and wrapping action/banner rows. The Service Centre branch retains its previous frame. The final mobile-shell and employee-portal browser checks remain blocked by the local browser runtime's sandbox startup failure. Type checking and server builds do not replace device acceptance.

The repository has browser-installable PWA manifests and a Downloads page, but no Android/iOS native project was found. Native launch requires a defined app shell/API contract, secure session/token storage, account/module switching, deep links, camera and location permission handling, push registration, upload retries and version compatibility. Start online-first; offline booking/stock/payment writes need a conflict-safe synchronization design rather than a generic service-worker cache.

Release matrix: 320/360/390/768-pixel widths; portrait/landscape; keyboard open; touch targets; long labels; table scrolling; forms and validation; modal focus; camera/location denied; poor network; staff/owner permissions; expiry; document viewing/printing; Android Chrome/WebView and iOS Safari/WKWebView. Each business package must complete its main workflow on real devices before an all-modules mobile-ready claim. Preserve the Service Centre baseline and run existing-user regression before any shared-shell change.

## Remaining decisions and release conditions

- Publish the combined accounting catalog only after entitlement and accounting/GST reconciliation acceptance. No existing account migration is included.
- Employee sign-in is implemented and tested locally; complete browser/device acceptance. Select a biometric/storage provider before implementing face attendance. Do not collect face images as a placeholder.
- Complete the rental specialist workflows above; current pricing/category/terms additions are only the first working expansion.
- Hotel core is implemented locally. Complete the broader hospitality checklist or explicitly constrain the launch offer to the tested owner-operated scope before active signup.
- Complete the native-app and all-module mobile acceptance matrix. Responsive public pages are not a released mobile application.
- The repository forbids agent writes to the shared production database. Any eventual catalog/schema activation remains a human-run release operation after review.
