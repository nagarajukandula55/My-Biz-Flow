# My Biz Flow

Modular, no-code, multi-vertical business/CRM platform. Businesses
mix-and-match modules (POS, Service Centre, Billing, Brand/multi-location,
Clinic, Inventory, etc.) on one account, all built on a shared metadata
engine (config-driven modules/fields/pipelines/dashboards).

## Before writing any UI code, read `DESIGN_SYSTEM.md`

It is binding, not a suggestion. Every color, font, spacing rule, and UI
component pattern in this repo is governed by that document. Do not
introduce a new font, hardcode a hex color, or hand-roll a table/chip/card
style outside of `src/components/`. If something you need isn't covered
there, that's a design-system change to propose first — not something to
freelance on a page-level PR.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + PostgreSQL — wired up (see `prisma/schema.prisma`, `src/lib/prisma.ts`).
  Backs the Designer's config stores (page customizations, document
  templates, module appearance, numbering, page access, error log) AND
  actual business records via the generic `BusinessRecord` table (invoices,
  work orders, etc. — keyed by module slug, `data` shape mirrors each
  module's Column/FormFieldDef vocabulary; see `src/lib/sample-data/*` for
  those field definitions, no longer the data source itself) plus
  per-module tables where a module outgrows the generic shape (e.g. Field
  Force's Engineer/Service/JobAllocation tables).
- Deploy target: Vercel

## Integration constraints

- This app integrates with a separate `central-api` service (business
  registration, platform auth/SSO, cross-tenant business mapping). Contract
  only — do not copy code or design from it or from other AN Group
  products (AN-CRM, ANgroup). This codebase is built from scratch.
- **Documented exception, widened 2026-08-08**: logged-in browsing of
  AN-CRM (crm.angroup.in) is permitted for UX/layout *pattern* reference
  during this build — the user explicitly authorized this after being
  asked to confirm, since it's a deliberate widening of the previous
  single-lookup-only rule. Still governed by the same limit on what may be
  taken: no code, component structure, copy, exact visual design, or
  asset gets copied — only the general interaction pattern (e.g. "jobsheet
  lifecycle stages shown on one page", "line items in a table with an add
  row") may inform an independently-built implementation using this
  repo's own design system and components. Every My Biz Flow module is
  still built from scratch against this repo's own data model — AN-CRM is
  a reference for shape, not a source to port from.
- **Documented exception, further widened 2026-09-04**: reading the local
  AN-CRM source checkout (e.g. `c:\Users\nagar\AN-CRM\src\models`) for
  *business-logic/data-model reference* is also permitted — the user
  explicitly authorized this after being asked to confirm it goes beyond
  the 2026-08-08 exception (that one covered the live logged-in product
  only, not its source). The same copy limit still governs: no code,
  component structure, exact schema, or asset gets copied — reading it may
  inform understanding of what a jobsheet/workorder lifecycle needs to
  cover (e.g. "which statuses a repair typically moves through," "what a
  brand/model/solution catalog needs to relate to"), which then gets
  independently designed and implemented against this repo's own Prisma
  schema, components, and conventions — never pasted or ported in.

## Repo layout

- `src/lib/fonts.ts` — the MBF Display/Sans/Mono font loaders
- `src/app/globals.css` — color tokens (light/dark/explicit-theme)
- `tailwind.config.ts` — token → Tailwind class mapping
- `src/components/` — the only approved shared UI components
- `src/app/design-system/` — live reference page for the whole system
- `src/lib/designer/modules.ts` — canonical module list (single source of
  truth for every module slug/label/taxonomy — a Partner's "type" is just
  its enabled modules, see DESIGN_SYSTEM.md §7)
- `src/lib/designer/registry.ts` — the Designer registry; every page must
  call `registerPage()` here, no exceptions (DESIGN_SYSTEM.md §7)
- `src/lib/designer/registerAll.ts` — side-effect imports of every module
  page, keep in sync when adding a module
- `src/app/partner/[partnerId]/<module-slug>/` — one folder per module:
  normal pages directly inside, one `admin/` subfolder gated to Super Admin
- `src/app/admin/designer/` — the live Super Admin page listing every
  registered page in the product; `/admin/designer/[pageId]` is a live
  field editor (edit labels, hide/add/delete fields, edit dropdown
  options) backed by `src/lib/designer/customizations.ts`
- `src/lib/designer/customizations.ts` — the Designer's live-editing store.
  Prisma/Postgres-backed (`PageCustomization` table) — same pattern as
  `documentTemplates.ts`, `moduleAppearance.ts`, `numbering.ts`,
  `pageAccess.ts`, and `src/lib/errorLog.ts`, all migrated off the old
  JSON-file stores onto real tables (see `prisma/schema.prisma`)
- `prisma/schema.prisma` + `src/lib/prisma.ts` — the Prisma schema and the
  singleton `PrismaClient` every data-access function imports; run
  `npx prisma migrate dev` after changing the schema
- `src/middleware.ts` + `src/lib/adminAuth.ts` — the Super Admin route
  gate. A single shared secret, not real per-user auth — see
  DESIGN_SYSTEM.md §9 before assuming this is a finished auth system
- `src/lib/env.ts` — the only place required env vars are read; see
  `.env.example`
- `src/lib/tenant.ts` — the tenant-scoping convention every future
  data-access function must follow, see DESIGN_SYSTEM.md §9
