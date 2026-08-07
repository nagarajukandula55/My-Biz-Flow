import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { LogisticsFleetClientTable } from "./LogisticsFleetClientTable";

registerPage({
  id: "logistics-fleet.list",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — List",
  path: "/vendor/[vendorId]/logistics-fleet",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every shipment record for the logistics-fleet module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/logistics-fleet/page.tsx",
});

export default function LogisticsFleetPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("logistics-fleet");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("logistics-fleet")}
      topbarTitle={mod?.label ?? "Logistics / Fleet"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/logistics-fleet/new`} className="btn-accent">
          + New Shipment
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LogisticsFleetClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

