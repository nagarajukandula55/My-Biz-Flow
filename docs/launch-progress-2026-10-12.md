# Launch validation and pricing — 12 October 2026

This report continues the 11 October report. All database testing uses the disposable local PostgreSQL cluster at `127.0.0.1:55439`. No production data, existing customer prices, subscriptions or deployment configuration was changed.

## Completed fixes and evidence

- Restored the public signup action's connection to atomic provisioning. Unavailable business types and invalid custom-field choices are rejected before creation; session-signing configuration is checked first. Contact conflicts are distinguished from other registration failures.
- New integration coverage checks all 25 commercial packages, owner/module-key creation, visible modules, revocation, pending access, cross-account access, Accounting/GST/Billing bundles, trial/Starter/Pro access and expired-account writes. These are real local database/action tests; they are not a claim that all browser workflows of all packages were exercised.
- Education now protects batch/course tenant boundaries, serializes enrollment capacity and reactivation, rejects duplicate active enrollment, serializes attendance, prevents payment reduction/overstatement and sends enrollment notifications only after commit.
- Manufacturing validates BOM/work-center ownership and quantities, records stages atomically, preserves completed orders and rejects completion through the generic status action. Completion must use its stock/cost workflow. Browser-safe status definitions are separated from database code.
- Browser acceptance linked a synthetic invoice, credit note and payment to the correct reviewed journals. Each showed “Amounts match” with the expected totals and tax allocation. This verifies manual matching, not bank reconciliation, fund transfers or government filing.
- Removed unsupported non-Service Centre user/location-cap, unlimited-access and SLA/support promises from tier descriptions. Service Centre feature and introduction values were preserved. Hotel now has descriptions reflecting its actual owner-operated workflow.

## Market-informed pricing

The [pricing review](module-pricing-2026-10-12.md) and [machine-readable proposal](market-pricing-proposal-2026-10-12.json) cover all 24 non-Service Centre packages. Sixteen official provider references were reviewed. Monthly and annual-equivalent prices, business/user/vehicle units, currency and feature differences are distinguished.

Seven proposed ladders were reduced: POS, Brand, Clinic, Manufacturing, Wholesale, Accounting/GST/Billing and Marketplace. Service Centre and existing customer plan IDs/prices remain unchanged; Field Force remains free with its separate existing transaction-fee configuration.

The proposal identifies actual bundled, registered premium pages. Packages without distinct premium features have only a Starter candidate; unsupported premium tiers remain on hold. Stored seat/location fields do not enforce capacity or create staff roles. The current two-plan tier mapping makes its top plan Ultimate, so removing draft tiers requires an explicit mapping decision and tests before publication. Nothing in this proposal publishes a price or changes a customer's renewal.

## External changes discovered during validation

The checkout advanced to include separate committed Service Centre pagination and Telegram changes. The old preservation baseline detected three changed files. Read-only review found invalid pagination inputs, full export reads on every page render, and Telegram support authorization/menu regressions.

The user explicitly approved narrowly scoped regression fixes on 12 October: “Fix the regressions; preserve existing workflows.” These fixes are complete. Customer/inquiry pages count and fetch one bounded page; full exports load on demand with fresh authorization and customer OTP checks. CSV bytes, labels and filenames remain equivalent. Telegram support handling now checks current administrators and partner write access. The four reviewed baseline differences, old/new hashes, external commits and acceptance evidence are retained in [the approval audit](service-centre-approved-review-2026-10-13.json); all other protected hashes remain unchanged.

## Current verification status

- On 13 October, all 80 main safety tests and 44 isolated PostgreSQL tests passed, including signup, Education, Manufacturing, Telegram permissions and Service Centre export preservation.
- Admin passed all 24 safety tests, 3 isolated PostgreSQL tests and its production build (96 static pages).
- The final main production build passed after fixing a missing tier-introduction export and Manufacturing client/server import boundary, including the final pricing-copy correction: POS stock belongs to Basic and non-Service Centre pricing cards/structured data no longer advertise unenforced user/location caps. Service Centre pricing copy is preserved.
- Real-server acceptance passed: dashboard, analytics, settings and notifications across 25 non-Service Centre modules; cross-tenant denial; Accounting reports/reconciliation; Rentals/Hotel/HRMS operational pages; employee authentication/revocation; 25 business detail pages; Accounting/GST redirect and unknown-type 404.
- Additional real-server Service Centre acceptance passed with 52 synthetic customers and inquiries: malformed pages render 25 rows, oversized page links clamp to the final two rows, full datasets are absent from page payloads, and customer OTP locking/unlocking/expiry remain enforced. All test fixtures are local and cleaned after the automated runs.
- The private launch catalog now carries explicit Starter/Pro/Ultimate tier IDs. Runtime pricing, partner entitlement checks and the Admin subscription view resolve those IDs explicitly; legacy customer plan IDs retain their existing positional behavior. A one-plan package therefore stays Starter instead of being promoted to Ultimate.
- Hotel room operations now include tenant-scoped housekeeping/maintenance tasks, named assignees, due dates, immutable completion notes and a guard that prevents a room returning to Ready while work remains open. Rentals already include partial-unit movement records, inspection notes and audited payment corrections; their focused correction and fulfilment tests pass.

## Remaining release limits

Full production launch is not yet certified. Deployed provider/authentication checks, real-device GPS acceptance, and recovery using an actual production backup remain unverified. Pricing/signup publication and production deployment have not occurred. General module-specific staff permissions and enforced account capacity are not available uniformly across all modules; the pricing copy does not claim otherwise.

The previously documented feature limits still apply: no native mobile apps in this web launch, facial recognition provider, statutory payroll/GST filing, Hotel OTA/multiple-property/staff-role parity, rental signatures/inspection attachments or partner-owned gateway integration. Internal manual payment records remain separate from platform Razorpay subscriptions.
