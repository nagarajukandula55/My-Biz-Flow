import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { ClinicClientTable } from "./ClinicClientTable";
import { ClinicNewButton } from "./ClinicNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { clinicColumns } from "@/lib/sample-data/clinic";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "clinic.list",
  moduleSlug: "clinic",
  title: "Clinic — List",
  path: "/vendor/[vendorId]/clinic",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every appointment record for the clinic module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/clinic/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ClinicPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("clinic");
  const columns = await applyCustomizations("clinic.list", clinicColumns);
  const rows = await listBusinessRecords(params.vendorId, "clinic");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Clinic"}
      topbarActions={
        <ClinicNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <ClinicClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

