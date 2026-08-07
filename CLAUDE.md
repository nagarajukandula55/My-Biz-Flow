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
