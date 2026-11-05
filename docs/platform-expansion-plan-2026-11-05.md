# My Biz Flow platform expansion plan

## Objective

Extend My Biz Flow into a configurable business operating platform for small,
mid-market and multi-location businesses while preserving existing live
workflows, especially Service Centre.

This plan is implementation guidance for the current repository. It is not a
claim that provider-backed features are already live.

## Protected production surface

The following areas are frozen unless a change is required to fix a verified
defect and has a dedicated regression test:

- `src/app/partner/[partnerId]/service-centre/`
- Service Centre work-order lifecycle, estimates, handover and invoice paths
- Service Centre tenant scoping, authorization and error-reference behavior
- Existing Prisma tables and columns containing live business data
- Existing shared shell behavior used by Service Centre

Any shared-component change must run the Service Centre safety and integration
tests before it can be considered for release.

## Delivery sequence

### Track 1 — platform foundation

- Universal search across tenant-scoped customers, records, invoices, leads and
  work orders
- Unified activity timeline and notification preferences
- Guided onboarding by business type
- Import/export and duplicate-detection utilities
- Role-based module navigation and saved dashboard preferences

### Track 2 — configurable operations

- Custom fields and forms using the existing Designer metadata model
- Configurable statuses and pipelines
- Approval rules, assignments, SLAs and escalations
- Recurring tasks and workflow automation
- Document-template and numbering improvements

### Track 3 — finance, CRM and inventory depth

- Shared CRM lifecycle and sales pipeline
- Purchasing and vendor workflows
- Bank-statement import and reconciliation
- Advanced stock locations, reservations, barcode/serial and expiry support
- Branch/project profitability and cash-flow reporting

### Track 4 — integrations and mobile

- Integration center with connection health, retries, logs and field mapping
- GST/e-invoice provider adapter boundary
- Payment, WhatsApp, email, calendar, shipping and accounting adapters
- Mobile field workflows, camera/barcode capture and conflict-safe offline sync

### Track 5 — enterprise and ecosystem

- SSO, stronger MFA, device/session controls and approval limits
- Versioned public API and signed webhooks
- Partner/developer extension model
- Governed, explainable AI assistance with tenant isolation and audit history

## Non-breaking implementation rules

1. Prefer additive tables, nullable fields and new service boundaries.
2. Do not run schema-mutating commands against the shared database from an
   agent session.
3. Keep all new data access tenant-scoped through the existing conventions.
4. Put reusable behavior in `src/lib/` or approved shared components; do not
   duplicate vertical-specific implementations.
5. Keep provider integrations behind adapters and feature flags. Missing
   credentials must produce a clear setup state, not a fake success.
6. Register every new page in the Designer registry and follow the design
   system before writing UI.
7. Every track must include unit/integration coverage and a Service Centre
   regression run before release consideration.

## Initial acceptance gates

- TypeScript and production build pass.
- Existing safety suite passes unchanged.
- Disposable PostgreSQL integration suite passes.
- Service Centre preservation baseline passes.
- No production database or external provider is changed by local development.
- No commit or push is performed until the user explicitly requests release.

