import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ManufacturingClientTable } from "./ManufacturingClientTable";
import { ManufacturingNewButton } from "./ManufacturingNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { manufacturingColumns } from "@/lib/sample-data/manufacturing";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "manufacturing.list",
  moduleSlug: "manufacturing",
  title: "Manufacturing / Production — List",
  path: "/vendor/[vendorId]/manufacturing",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every work order record for the manufacturing module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/manufacturing/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ManufacturingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("manufacturing");
  const columns = await applyCustomizations("manufacturing.list", manufacturingColumns);
  const rows = await listBusinessRecords(params.vendorId, "manufacturing");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Manufacturing / Production"}
      topbarActions={
        <ManufacturingNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ManufacturingClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

