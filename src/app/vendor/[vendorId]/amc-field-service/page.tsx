import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { AmcFieldServiceClientTable } from "./AmcFieldServiceClientTable";
import { AmcFieldServiceNewButton } from "./AmcFieldServiceNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { amcFieldServiceColumns } from "@/lib/sample-data/amc-field-service";

registerPage({
  id: "amc-field-service.list",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — List",
  path: "/vendor/[vendorId]/amc-field-service",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every contract record for the amc-field-service module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/amc-field-service/page.tsx",
});

export default async function AmcFieldServicePage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("amc-field-service");
  const columns = await applyCustomizations("amc-field-service.list", amcFieldServiceColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "AMC / Field Service"}
      topbarActions={
        <AmcFieldServiceNewButton />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <AmcFieldServiceClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

