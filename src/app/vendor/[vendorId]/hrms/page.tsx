import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { HrmsClientTable } from "./HrmsClientTable";
import { HrmsNewButton } from "./HrmsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { hrmsColumns } from "@/lib/sample-data/hrms";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "hrms.list",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — List",
  path: "/vendor/[vendorId]/hrms",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every employee record for the hrms module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/hrms/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function HrmsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("hrms");
  const columns = await applyCustomizations("hrms.list", hrmsColumns);
  const rows = await listBusinessRecords(params.vendorId, "hrms");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "HRMS / Payroll"}
      topbarActions={
        <HrmsNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <HrmsClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

