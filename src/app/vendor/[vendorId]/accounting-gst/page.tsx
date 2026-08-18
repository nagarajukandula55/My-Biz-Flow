import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { AccountingGstClientTable } from "./AccountingGstClientTable";
import { AccountingGstNewButton } from "./AccountingGstNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { accountingGstColumns } from "@/lib/sample-data/accounting-gst";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "accounting-gst.list",
  moduleSlug: "accounting-gst",
  title: "Accounting / GST Compliance — List",
  path: "/vendor/[vendorId]/accounting-gst",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every gst return record for the accounting-gst module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/accounting-gst/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AccountingGstPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("accounting-gst");
  const columns = await applyCustomizations("accounting-gst.list", accountingGstColumns);
  const rows = await listBusinessRecords(params.vendorId, "accounting-gst");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Accounting / GST Compliance"}
      topbarActions={
        <div className="flex items-center gap-2">
          <Link href={`/vendor/${params.vendorId}/accounting-gst/dashboard`} className="btn-outline">
            Dashboard
          </Link>
          <Link href={`/vendor/${params.vendorId}/accounting-gst/generate`} className="btn-outline">
            Generate Return
          </Link>
          <AccountingGstNewButton vendorId={params.vendorId} />
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <AccountingGstClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

