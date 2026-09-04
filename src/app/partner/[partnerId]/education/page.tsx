import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { EducationClientTable } from "./EducationClientTable";
import { EducationNewButton } from "./EducationNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { educationColumns } from "@/lib/sample-data/education";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "education.list",
  moduleSlug: "education",
  title: "Education / Coaching — List",
  path: "/partner/[partnerId]/education",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every enrollment record for the education module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/education/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function EducationPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("education");
  const columns = await applyCustomizations("education.list", educationColumns);
  const rows = await listBusinessRecords(params.partnerId, "education");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Education / Coaching"}
      topbarActions={
        <div className="flex items-center gap-2">
          <Link href={`/partner/${params.partnerId}/education/batches`} className="btn-outline">
            Batches
          </Link>
          <EducationNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <EducationClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

