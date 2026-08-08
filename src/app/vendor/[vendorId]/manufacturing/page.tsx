import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { buildVendorAdminNavGroups } from "@/lib/designer/vendorAdminNav";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { ManufacturingClientTable } from "./ManufacturingClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { manufacturingColumns } from "@/lib/sample-data/manufacturing";

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

export default async function ManufacturingPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("manufacturing");
  const columns = await applyCustomizations("manufacturing.list", manufacturingColumns);

  return (
    <AppShell
      vendorId={params.vendorId}
      navGroups={await buildVendorAdminNavGroups(undefined, "manufacturing")}
      topbarTitle={mod?.label ?? "Manufacturing / Production"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/manufacturing/new`} className="btn-accent">
          + New Work Order
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ManufacturingClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

