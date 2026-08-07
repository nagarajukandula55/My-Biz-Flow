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

## 7. Process for changing this system

1. This doc, `src/lib/fonts.ts`, `src/app/globals.css`, `tailwind.config.ts`,
   and `src/components/` change together, in the same PR, or not at all.
2. Update the `/design-system` reference page in the same PR so it stays
   accurate.
3. No page-level PR introduces a new color, font, spacing scale, or
   component pattern. If a page needs something new, that's a design-system
   PR first, a page PR second.
