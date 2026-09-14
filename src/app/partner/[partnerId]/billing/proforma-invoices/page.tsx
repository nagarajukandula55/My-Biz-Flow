import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { ProformaInvoicesClientTable } from "./ProformaInvoicesClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { proformaInvoiceColumns } from "@/lib/sample-data/billing-sales-documents";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.proforma-invoices.list",
  moduleSlug: "billing",
  title: "Billing — Proforma Invoices",
  path: "/partner/[partnerId]/billing/proforma-invoices",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Proforma Invoice — a non-binding pre-invoice issued ahead of the real tax invoice — with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/billing/proforma-invoices/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ProformaInvoicesPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "billing.proforma-invoices.list", "Proforma Invoices");
  if (tierGate) return <AppShell topbarTitle={"Proforma Invoices"}>{tierGate}</AppShell>;

  const columns = await applyCustomizations("billing.proforma-invoices.list", proformaInvoiceColumns);
  const rows = await listBusinessRecords(params.partnerId, "billing-proforma-invoices");

  return (
    <AppShell
      topbarTitle="Proforma Invoices"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/billing/proforma-invoices/new`} className="btn-accent">
          + New Proforma Invoice
        </Link>
      }
    >
      <div>
        <div className="mt-2">
          <ProformaInvoicesClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
