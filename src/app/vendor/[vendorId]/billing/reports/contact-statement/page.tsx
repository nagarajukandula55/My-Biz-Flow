import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.reports.contact-statement.index",
  moduleSlug: "billing",
  title: "Billing — Reports — Contact Statement — Pick Contact",
  path: "/vendor/[vendorId]/billing/reports/contact-statement",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every Billing contact — pick one to view its statement (invoices, notes and payments, computed in-memory).",
  sourceFile: "src/app/vendor/[vendorId]/billing/reports/contact-statement/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ContactStatementIndexPage({ params }: { params: { vendorId: string } }) {
  const contacts = await listBusinessRecords(params.vendorId, "billing-contacts");

  return (
    <AppShell topbarTitle="Contact Statement">
      <div>
        <p className="text-sm text-text-muted">Pick a contact to view their statement.</p>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-bg-raised">
          {contacts.length === 0 && <div className="p-4 text-sm text-text-muted">No contacts yet.</div>}
          {contacts.map((c) => (
            <Link
              key={String(c["id"])}
              href={`/vendor/${params.vendorId}/billing/reports/contact-statement/${c["id"]}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-sunken"
            >
              <span className="font-semibold text-text">{String(c["name"] ?? c["id"])}</span>
              <span className="text-text-muted">{String(c["id"])}</span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
