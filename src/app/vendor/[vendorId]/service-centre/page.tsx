import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ServiceCentreClientTable } from "./ServiceCentreClientTable";
import { ServiceCentreNewButton } from "./ServiceCentreNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { serviceCentreColumns } from "@/lib/sample-data/service-centre";
import { listBusinessRecords } from "@/lib/businessRecords";

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

export const dynamic = "force-dynamic";

export default async function ServiceCentrePage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("service-centre");
  const columns = await applyCustomizations("service-centre.list", serviceCentreColumns);
  const rows = await listBusinessRecords(params.vendorId, "service-centre");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Service Centre"}
      topbarActions={
        <ServiceCentreNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ServiceCentreClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

