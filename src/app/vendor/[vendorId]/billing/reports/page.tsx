import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";

registerPage({
  id: "billing.reports.index",
  moduleSlug: "billing",
  title: "Billing — Reports",
  path: "/vendor/[vendorId]/billing/reports",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Hub linking to Billing's report pages (Outstanding/AR aging, Sales register, Tax summary, Contact statement) — each aggregates live BusinessRecord data in-memory, no separate reporting infrastructure.",
  sourceFile: "src/app/vendor/[vendorId]/billing/reports/page.tsx",
});

const REPORTS = [
  { href: "outstanding", title: "Outstanding / AR Aging", description: "Unpaid balance per contact, bucketed by days overdue." },
  { href: "sales", title: "Sales Register", description: "Every invoice with subtotal, tax and total, and a running sum." },
  { href: "tax-summary", title: "Tax Summary", description: "Taxable value and tax collected, grouped by GST rate." },
  { href: "contact-statement", title: "Contact Statement", description: "Per-contact ledger of invoices, notes and payments." },
];

export default function BillingReportsPage({ params }: { params: { vendorId: string } }) {
  return (
    <AppShell topbarTitle="Reports">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={`/vendor/${params.vendorId}/billing/reports/${r.href}`}
            className="rounded-lg border border-border bg-bg-raised p-4 transition-colors hover:border-accent"
          >
            <div className="font-display text-base font-bold text-text">{r.title}</div>
            <p className="mt-1 text-sm text-text-muted">{r.description}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
