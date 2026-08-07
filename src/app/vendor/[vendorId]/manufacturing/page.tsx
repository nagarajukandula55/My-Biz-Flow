import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { ManufacturingClientTable } from "./ManufacturingClientTable";

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

export default function ManufacturingPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("manufacturing");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("manufacturing")}
      topbarTitle={mod?.label ?? "Manufacturing / Production"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/manufacturing/new`} className="btn-accent">
          + New Work Order
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ManufacturingClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

