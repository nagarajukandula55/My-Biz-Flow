import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { AccountingGstClientTable } from "./AccountingGstClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { accountingGstColumns } from "@/lib/sample-data/accounting-gst";

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

export default function AccountingGstPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("accounting-gst");
  const columns = applyCustomizations("accounting-gst.list", accountingGstColumns);

  return (
    <AppShell
      navGroups={buildVendorNavGroups("accounting-gst")}
      topbarTitle={mod?.label ?? "Accounting / GST Compliance"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/accounting-gst/new`} className="btn-accent">
          + New GST Return
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <AccountingGstClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

