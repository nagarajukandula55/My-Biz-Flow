import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { EducationClientTable } from "./EducationClientTable";
import { EducationNewButton } from "./EducationNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { educationColumns } from "@/lib/sample-data/education";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "education.list",
  moduleSlug: "education",
  title: "Education / Coaching — List",
  path: "/vendor/[vendorId]/education",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every enrollment record for the education module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/education/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EducationPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("education");
  const columns = await applyCustomizations("education.list", educationColumns);
  const rows = await listBusinessRecords(params.vendorId, "education");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Education / Coaching"}
      topbarActions={
        <EducationNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <EducationClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

