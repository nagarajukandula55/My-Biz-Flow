import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { PosClientTable } from "./PosClientTable";
import { PosNewButton } from "./PosNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { posColumns } from "@/lib/sample-data/pos";

registerPage({
  id: "pos.list",
  moduleSlug: "pos",
  title: "POS — List",
  path: "/vendor/[vendorId]/pos",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every sale record for the pos module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/pos/page.tsx",
});

export default async function PosPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("pos");
  const columns = await applyCustomizations("pos.list", posColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "POS"}
      topbarActions={
        <PosNewButton />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <PosClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

