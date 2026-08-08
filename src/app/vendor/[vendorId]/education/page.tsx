import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { EducationClientTable } from "./EducationClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { educationColumns } from "@/lib/sample-data/education";

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

export default function EducationPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("education");
  const columns = applyCustomizations("education.list", educationColumns);

  return (
    <AppShell
      navGroups={buildVendorNavGroups("education")}
      topbarTitle={mod?.label ?? "Education / Coaching"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/education/new`} className="btn-accent">
          + New Enrollment
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <EducationClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

