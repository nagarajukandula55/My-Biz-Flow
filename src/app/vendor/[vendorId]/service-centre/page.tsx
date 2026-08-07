import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { ServiceCentreClientTable } from "./ServiceCentreClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";

registerPage({
  id: "service-centre.list",
  moduleSlug: "service-centre",
  title: "Service Centre — List",
  path: "/vendor/[vendorId]/service-centre",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every workorder record for the service-centre module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/page.tsx",
});

export default function ServiceCentrePage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("service-centre");
  const columns = applyCustomizations("service-centre.list", serviceCentreColumns);

  return (
    <AppShell
      navGroups={buildVendorNavGroups("service-centre")}
      topbarTitle={mod?.label ?? "Service Centre"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/service-centre/new`} className="btn-accent">
          + New Workorder
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ServiceCentreClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

