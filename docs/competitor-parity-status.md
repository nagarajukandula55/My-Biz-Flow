# Competitor-parity completion audit

This is the release checklist for the current My Biz Flow parity goal. A row is only complete when the referenced workflow exists, is tenant-scoped, and passes the Main and Admin safety gates.

| Capability | Current evidence | Status | Release condition |
| --- | --- | --- | --- |
| Interior measurement billing | Interior project measurements, BOQ, quotation/invoice conversion and stock consumption | Implemented | End-to-end regression audit |
| Customer material collaboration | Signed customer selection-response route and partner workflow alert | Implemented locally | Add portal discoverability and regression coverage |
| Distributor order lifecycle | Credit checks, dealer portal, dispatch metadata, pick/pack stages and fulfilment report | Implemented locally | Validate dispatch/fulfilment transition matrix |
| Warehouse traceability | Tenant-scoped lot/serial lookup and audited stock mutation paths | Implemented | Add bin/reservation execution |
| Accounting/GST | Reconciliation, explicit ledger posting and GST working-paper export | Implemented | Provider-backed bank/IRP integrations |
| Service Centre | Existing protected behavior and safety invariants | Protected | No destructive changes permitted |
| AMC field service | Dispatch board, SLA priority, workload and technician check-in | Implemented | Mobile/offline technician synchronization |
| Offline operations | Offline draft review and narrow safe replay | Partial | Add fulfilment replay and conflict handling |
| Integrations | Readiness catalog, JSON logistics handoff and webhook security foundations | Partial | Provider/carrier/EDI execution |
| Explainable workflow AI | Rule-based insights with actionable reasons and links | Implemented | Optional provider-backed assistance with audit controls |

## Release gates

1. Main `npx tsc --noEmit` passes.
2. Main `npm run test:safety` passes, including the protected Service Centre test.
3. Admin `npx tsc --noEmit` and `npm run test:safety` pass.
4. Both worktrees contain only intended changes, and the final commit is pushed only after every partial row is resolved or explicitly released as a documented limitation.

## Held external dependencies

The following items are intentionally held and are not represented as live capability until the required external setup exists:

- Government GST/IRP/e-invoice/e-way-bill submission: requires the partner's GST provider credentials, sandbox/production choice, signing configuration, and filing approval process.
- Live bank feeds: requires a supported banking/open-banking provider, consent flow, account linking, webhook configuration, and reconciliation policy.
- Carrier, EDI, and marketplace execution: requires selected carriers/EDI partners, credentials, mapping contracts, retry rules, and partner test fixtures.
- Provider-backed AI: requires an approved model/provider, data-retention policy, tenant consent, budget limits, and evaluation fixtures.
- Competitor parity sign-off: requires named competitor products and an agreed feature-by-feature acceptance checklist.

These held items do not block release of the completed internal workflows below them, provided the release notes clearly identify them as provider-pending.

## Pricing safety

Published pricing is competitive-positioned, but the application does not know hosting, messaging, payment-processing, support, or usage costs. Therefore it cannot prove a margin or promise that a price is loss-free. Before changing a public plan price, Super Admin must approve a cost baseline covering expected usage, payment fees, GST treatment, support burden, and the intended gross-margin floor. Pricing changes remain an Admin publishing decision; the public page reads the approved Plan rows and calculates only the documented billing-cycle discounts and GST-inclusive checkout amount.
