import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { SolutionsClientTable } from "./SolutionsClientTable";
import { SolutionsNewButton } from "./SolutionsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { solutionsColumns } from "@/lib/sample-data/solutions";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.solutions.list",
  moduleSlug: "service-centre",
  title: "Solutions — List",
  path: "/partner/[partnerId]/service-centre/solutions",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Partner-owned catalog of solutions selected when logging Parts & Service Lines on a workorder. Each partner manages their own list.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/solutions/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SolutionsPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("service-centre.solutions.list", solutionsColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-solutions");

  return (
    <AppShell topbarTitle="Solutions" topbarActions={<SolutionsNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <SolutionsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
