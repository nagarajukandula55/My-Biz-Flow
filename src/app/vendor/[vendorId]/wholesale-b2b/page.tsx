import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { WholesaleB2bClientTable } from "./WholesaleB2bClientTable";
import { WholesaleB2bNewButton } from "./WholesaleB2bNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { wholesaleB2bColumns } from "@/lib/sample-data/wholesale-b2b";

registerPage({
  id: "wholesale-b2b.list",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — List",
  path: "/vendor/[vendorId]/wholesale-b2b",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every order record for the wholesale-b2b module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/wholesale-b2b/page.tsx",
});

export default async function WholesaleB2bPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("wholesale-b2b");
  const columns = await applyCustomizations("wholesale-b2b.list", wholesaleB2bColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Wholesale / Distributor B2B"}
      topbarActions={
        <WholesaleB2bNewButton />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <WholesaleB2bClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

