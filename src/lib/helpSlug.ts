/**
 * Kebab-case a Help & Tutorials section title into its stable anchor id,
 * e.g. "Billing & Invoices" -> "billing-invoices". Shared, plain module
 * (no "use client") so both the accordion itself (HelpAccordion.tsx) and
 * server-side code (supportAutoReply.ts, via the Telegram webhook route)
 * can import it safely — importing a function from a "use client" file
 * into server code breaks at build time (confirmed: `next build` failed
 * with "is not a function" when supportAutoReply.ts imported this from
 * HelpAccordion.tsx directly), even though it's a plain, non-component
 * export.
 */
export function helpSectionSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
