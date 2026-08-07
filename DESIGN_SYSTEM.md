# My Biz Flow — Design System (binding)

This document is not a style suggestion. It is the single source of truth for
every screen, component, and PR that enters this repository. If a change
does not follow this doc, it does not merge — fix the change, or propose an
amendment to this doc first and get it agreed before writing the code.

No page, component, or feature may introduce its own colors, fonts, spacing
values, or layout pattern outside of what's defined here. If something you
need isn't covered below, that's a gap in the design system, not a license
to freelance — extend this doc and the shared tokens/components first, then
build on top of them.

## 1. Type system — "MBF Type System"

Defined in `src/lib/fonts.ts`, loaded via `next/font/google` (self-hosted at
build time — no runtime CDN request, no silent fallback to whatever font a
device happens to have installed). Exposed as Tailwind font families
`font-display`, `font-sans` (default), `font-mono` via `tailwind.config.ts`.

| Role | Family | Weights loaded | Use for | Never use for |
|---|---|---|---|---|
| **MBF Display** | Archivo | 700, 800 | `h1`–`h3`, wordmark, topbar titles, sidebar brand | Body copy, table cells, buttons |
| **MBF Sans** | IBM Plex Sans | 400, 600, 700 | All interface text: labels, tables, buttons, body copy — the default | Headings, tabular figures |
| **MBF Mono** | IBM Plex Mono | 500, 700 | Tabular figures — amounts, IDs, stats. Always pair with `tabular-nums` | Headings, prose |

Rules:
- Only the weights above are loaded. Do not request a weight that isn't
  loaded (e.g. Archivo 400) — the browser will fake-match to the nearest
  loaded weight, which is not a real design decision, it's an accident.
- Any number that lines up in a column (amounts, IDs, dates in a table) gets
  `font-mono` + `tabular-nums`. Never let currency figures render in
  proportional digits.
- No other font family may be introduced without updating this doc and
  `src/lib/fonts.ts` together.

## 2. Color tokens

Defined as CSS custom properties in `src/app/globals.css`, exposed as
Tailwind colors (`bg-bg`, `text-text`, `bg-accent`, etc. — see
`tailwind.config.ts` for the full token → class mapping). Never hardcode a
hex value in a component; always reference a token.

Three theme states are supported and must all keep working:
1. System light (default `:root`, no `data-theme` stamp)
2. System dark (`prefers-color-scheme: dark`, guarded so an explicit light
   choice still wins)
3. Explicit override (`data-theme="dark"` / `data-theme="light"` on `<html>`)

Semantic rules — do not break these:
- **`--accent` (Flow Amber)** = brand/admin/primary action only. Text on an
  accent background uses `--accent-contrast` (dark ink), **not white** —
  white-on-amber fails contrast. This was fixed once already; don't
  reintroduce it.
- **`--teal` (Flow Teal)** = vertical/module identity color. Used for
  module sidebar dots, relation-link text, and module-owned accents.
- **Neutral / `--text-muted`** = cross-cutting module identity (Inventory,
  HRMS, etc.) — never the brand accent.
- **`--danger` / `--success` / `--warning`** = status only. Never reused as
  a decorative accent, never used for brand/primary actions.
- Any new UI state needs a token added to `globals.css` (light + both dark
  paths) before it's used in a component — not an inline color.

## 3. Logo

`src/components/LogoMark.tsx` — three connected circular nodes (teal,
amber, teal), inline SVG, inherits theme tokens. This is the only approved
mark. Do not introduce a second logo treatment, a rasterized logo image, or
a wordmark set in anything other than MBF Display.

## 4. Layout — full width, not centered

Pages use the full viewport with responsive safe-gutter padding via
`clamp()` — see the `.page` pattern established in the design concept and
carried into `AppShell`. **Do not wrap page content in a centered
`max-width` container.** Paragraph-length text may constrain its own
reading measure (~65ch) locally; grids, tables, and the overall page
shell must not.

## 5. Component library — use these, don't rebuild them

Everything in `src/components/` is the only approved way to build the UI
surfaces below. If a new page needs one of these patterns, import the
component — do not hand-roll a new table, chip, or card style.

| Component | Purpose | Notes |
|---|---|---|
| `AppShell` | Sidebar + topbar + content frame | Sidebar nav dots: teal = vertical module, neutral = cross-cutting module, amber = brand/admin |
| `DataTable` | Config-driven table (`columns` + `rows`) | Column `type` drives cell rendering (text/currency/date/select-chip/relation-link) — never hardcode columns per page |
| `StatusChip` | Pill + dot, variant-driven | Variants map to the soft-background tokens (`warning-soft`, `teal-soft`, etc.) |
| `KanbanBoard` | Stage-driven card columns | Stages + cards are config, not hardcoded per module |
| `RecordDetail` | Field-grid + timeline + related-records rail | One shared per-type field renderer (text/relation/currency/date/boolean/select) reused by every module |
| `DashboardWidget` | Stat tile | `neon` prop enables the glow treatment — see rule below |

### Neon numeral treatment

A static `text-shadow` glow (via `color-mix(in srgb, var(--accent) X%,
transparent)`), reserved for **one hero figure per screen** — e.g. a
dashboard's primary revenue stat. Rules:
- **Dark mode only.** In light mode it must render as a plain solid accent
  color — glow-on-white looks muddy, this was tested and rejected.
- **No animation.** It's a static shadow, so `prefers-reduced-motion`
  needs no special handling.
- **Sparingly.** Don't apply it broadly across a table or list — it loses
  meaning if every number glows.

## 6. Reference page

`src/app/design-system` renders every token, type role, and component
above with realistic sample data. When in doubt about how something should
look, check this page — it is the live, buildable source of truth, not the
earlier Artifact mockups (those were the proposal; this repo is the
decision).

## 7. Folder convention and the Designer registry (binding)

### Vendor terminology (locked)

A signed-up company is called a **Vendor** internally — matching central-api's
own vocabulary for this concept, deliberately, so our schema and central-api's
`vendors` dataset speak the same language. There is no separate "sign up for
My Biz Flow" flow; signup is **"register your business"**, and during signup
the person picks which module type(s) they're registering for (Brand, SC,
POS, AMC, Billing, Clinic, etc.) — that selection becomes the Vendor's
enabled-modules set. A Vendor's "type" is just its enabled modules, not a
separate enum; a Vendor can be typed by more than one module at once (e.g. a
"POS + Inventory + Billing" Vendor).

### Module folder structure

Every module in `src/lib/designer/modules.ts` (the canonical module list —
this is the only place a module's slug/label/taxonomy is defined) gets
exactly one folder: `src/app/vendor/[vendorId]/<slug>/`. That folder holds:

1. **Normal (vendor-facing) pages** directly inside it — `page.tsx` for the
   list view, `[recordId]/page.tsx` for detail, etc.
2. **One `admin/` subfolder**, gated to Super Admin only via the
   `SuperAdminGate` component (`src/components/SuperAdminGate.tsx`) — this is
   where a module's no-code configuration lives (field definitions, pipeline
   stages, permissions).

Nothing else goes in a module folder. If a page doesn't fit "normal" or
"Super Admin admin," that's a sign it belongs in a different module, in
`src/lib/engine/` as shared infrastructure, or is a sign the module list
itself needs a new entry — not a reason to add a third kind of subfolder.

Adding a module: add one entry to `MODULES` in
`src/lib/designer/modules.ts` first, then scaffold its folder, then add its
two page imports to `src/lib/designer/registerAll.ts`. In that order —
never create a module folder that isn't in the registry.

### The Designer registry (binding — nothing gets missed)

Every single page in this app — without exception — must call
`registerPage()` from `src/lib/designer/registry.ts` at module scope. This
is not optional documentation-as-comment; it is how
`/admin/designer` (Super Admin only) enumerates and will eventually make
customizable every page in the product. A page that doesn't register is a
page the Designer cannot find, and per this doc, that's a bug to fix before
merge, not an acceptable gap.

When you add a page:
1. Call `registerPage({ id, moduleSlug, title, path, kind, superAdminOnly, customizableRegions })` at the top of the file, outside the component function.
2. List every real customization surface on that page in `customizableRegions` — table columns, filters, pipeline stages, form fields, whatever a Super Admin should eventually be able to change without a code deploy. Don't under-list this; an empty or vague `customizableRegions` array defeats the entire point.
3. Add a side-effect import of the new page file to `src/lib/designer/registerAll.ts` (grouped under its module), so `/admin/designer` reliably sees it regardless of which route Next.js happens to have already loaded in a given server process.
4. Confirm it shows up on `/admin/designer` before merging.

The `/admin/designer` page itself is the live source of truth for "is
everything modular and customizable, nothing missed" — if a page is
missing there, the answer is currently no, and that's what to fix.

## 8. Process for changing this system

1. This doc, `src/lib/fonts.ts`, `src/app/globals.css`, `tailwind.config.ts`,
   `src/components/`, and `src/lib/designer/` (`modules.ts`, `registry.ts`,
   `registerAll.ts`) change together, in the same PR, or not at all.
2. Update the `/design-system` reference page in the same PR so it stays
   accurate.
3. No page-level PR introduces a new color, font, spacing scale, or
   component pattern. If a page needs something new, that's a design-system
   PR first, a page PR second.
4. No page-level PR skips `registerPage()` or leaves it out of
   `registerAll.ts`. Verify on `/admin/designer` before merging.
5. A new required environment variable gets a getter in `src/lib/env.ts`
   and a line in `.env.example` in the same PR — never read directly from
   `process.env` elsewhere. A new data-access function gets tenant scoping
   (`src/lib/tenant.ts`) in the same PR it's introduced in, not after.

### `PageDefinition` also carries `explanation` and `sourceFile`

Every `registerPage()` call must include two additional fields beyond the
original set:

- `explanation: string` — a real plain-language paragraph on what the page
  does and why it exists. Not a repeat of the title.
- `sourceFile: string` — the file path relative to repo root, e.g.
  `"src/app/vendor/[vendorId]/pos/page.tsx"`. `/admin/designer/[pageId]`
  reads this file from disk server-side and renders it for inspection —
  keep it accurate or that view breaks for that page.

### `RecordForm` — the one approved create/edit form

`src/components/RecordForm.tsx` is a `"use client"` config-driven form: it
takes a `fields: FormFieldDef[]` (`{key,label,type,required,options?}`,
`type` one of `text | number | date | select | currency | boolean |
textarea | relation | multi-select`) and an optional `initialValues`, and
renders the right input per field. `multi-select` (added for Access
Groups/Roles/Plans' module-slug pickers) renders `options` as a scrollable
checkbox list and stores the value as `string[]`; `DataTable`'s matching
`multi-chip` column type and `RecordDetail`'s matching `multi-select` field
type render that same `string[]` shape as a row of `StatusChip`s — all
three stay in sync by construction, extend them together if a fourth
multi-value consumer is ever added. Every module's create page passes it the module's
field set with `submitLabel="Create <record type>"`; every edit page passes
the same fields with `initialValues` from the record and
`submitLabel="Save changes"`. Do not hand-roll a bespoke form per module —
if a field type doesn't fit, extend `FormFieldType` and `RecordForm`
itself, not a one-off page.

There is no backend/database wired up yet, so submission is a client-side
demo stub: it logs the values and shows "Saved (demo — no backend yet)."
Replace that stub, not the component's shape, once persistence lands.

### `ConfirmDeleteDialog` — the one approved delete confirmation

`src/components/ConfirmDeleteDialog.tsx` is a `"use client"` controlled
modal (`useState` show/hide, not a headless-UI dependency) taking a
`recordLabel` to name in the confirmation copy. It's used from every
module's detail page Delete action (and optionally from list rows). Cancel
closes it with no side effect; Delete is `btn-danger`-styled and, absent a
backend, logs and shows a "Deleted (demo)" message.

### Buttons

`.btn-accent` (brand/primary action, `--accent` background with
`--accent-contrast` text), `.btn-danger` (destructive action, `--danger`
background), and `.btn-outline` (secondary action, bordered) are defined in
`src/app/globals.css` as the only approved button treatments — don't
hand-style a button with ad hoc Tailwind classes on a page. Any new button
variant needs a token-driven class added here first, per the process rule
above.

## 9. Access control and tenant scoping (binding)

### Super Admin gate

`src/middleware.ts` blocks any request under `/admin/*` or a module's
`.../admin/*` subfolder unless a valid session cookie is present (see
`src/lib/adminAuth.ts`). This is a **single shared secret**
(`SUPER_ADMIN_SECRET`), not real per-user auth — there is no individual
admin identity, no role granularity, and no audit trail of *who* made a
change. `SuperAdminGate`'s on-page banner exists specifically to keep that
gap visible. When NextAuth + per-user roles land (matching central-api's
own `PlatformUser.businessAccess[].role` model), replace
`src/lib/adminAuth.ts` and `src/middleware.ts` wholesale — don't try to
evolve the shared-secret approach into real auth incrementally.

### Environment variables

`src/lib/env.ts` is the only place that reads `process.env` for required
variables — don't reach for `process.env.X` directly elsewhere. Reads are
lazy (checked when used, not at import time), so a variable for a feature
that isn't wired up yet won't crash pages that don't touch it. New required
variables get a getter added to `env.ts` and documented in `.env.example`
in the same PR.

### Tenant scoping

Every route under `/vendor/[vendorId]/...` carries a vendorId, but nothing
enforces yet that data returned actually belongs to that vendor — there's
no database, so the gap is currently invisible. `src/lib/tenant.ts`
establishes the convention now, before the first real query is written:
every future data-access function must take a vendorId and call
`assertVendorScope()` (or the Prisma-era equivalent, a `where: { vendorId }`
clause) before returning anything. Fail closed, not open. This is not
optional cleanup for later — retrofitting tenant scoping onto code written
without the habit is how cross-tenant data leaks happen.

### CI

`.github/workflows/ci.yml` runs `tsc --noEmit` and `npm run build` on every
push to `main`/`claude/**` and every PR into `main`. A change that breaks
either does not merge — this exists because every regression caught so far
in this project was found by manually re-running the build, which does not
scale as the page count grows.
