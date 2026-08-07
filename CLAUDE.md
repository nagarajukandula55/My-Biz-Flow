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
- Prisma + PostgreSQL (backend, not yet wired up)
- Deploy target: Vercel

## Integration constraints

- This app integrates with a separate `central-api` service (business
  registration, platform auth/SSO, cross-tenant business mapping). Contract
  only — do not copy code or design from it or from other AN Group
  products (AN-CRM, ANgroup). This codebase is built from scratch.

## Repo layout

- `src/lib/fonts.ts` — the MBF Display/Sans/Mono font loaders
- `src/app/globals.css` — color tokens (light/dark/explicit-theme)
- `tailwind.config.ts` — token → Tailwind class mapping
- `src/components/` — the only approved shared UI components
- `src/app/design-system/` — live reference page for the whole system
- `src/lib/designer/modules.ts` — canonical module list (single source of
  truth for every module slug/label/taxonomy — a Vendor's "type" is just
  its enabled modules, see DESIGN_SYSTEM.md §7)
- `src/lib/designer/registry.ts` — the Designer registry; every page must
  call `registerPage()` here, no exceptions (DESIGN_SYSTEM.md §7)
- `src/lib/designer/registerAll.ts` — side-effect imports of every module
  page, keep in sync when adding a module
- `src/app/vendor/[vendorId]/<module-slug>/` — one folder per module:
  normal pages directly inside, one `admin/` subfolder gated to Super Admin
- `src/app/admin/designer/` — the live Super Admin page listing every
  registered page in the product; `/admin/designer/[pageId]` is a live
  field editor (edit labels, hide/add/delete fields, edit dropdown
  options) backed by `src/lib/designer/customizations.ts`
- `src/lib/designer/customizations.ts` — the Designer's live-editing store.
  JSON-file-backed (no database yet) — read the file header before
  touching it, the Vercel-runtime tradeoff is explicit and load-bearing
- `src/middleware.ts` + `src/lib/adminAuth.ts` — the Super Admin route
  gate. A single shared secret, not real per-user auth — see
  DESIGN_SYSTEM.md §9 before assuming this is a finished auth system
- `src/lib/env.ts` — the only place required env vars are read; see
  `.env.example`
- `src/lib/tenant.ts` — the tenant-scoping convention every future
  data-access function must follow, see DESIGN_SYSTEM.md §9
