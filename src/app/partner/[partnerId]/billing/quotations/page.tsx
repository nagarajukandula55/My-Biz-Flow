import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { QuotationsClientTable } from "./QuotationsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { quotationColumns } from "@/lib/sample-data/billing-sales-documents";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.quotations.list",
  moduleSlug: "billing",
  title: "Billing — Quotations",
  path: "/partner/[partnerId]/billing/quotations",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Quotation — a price quote sent to a contact before any invoice is raised — with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/billing/quotations/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function QuotationsPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("billing.quotations.list", quotationColumns);
  const rows = await listBusinessRecords(params.partnerId, "billing-quotations");

  return (
    <AppShell
      topbarTitle="Quotations"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/billing/quotations/new`} className="btn-accent">
          + New Quotation
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <QuotationsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
