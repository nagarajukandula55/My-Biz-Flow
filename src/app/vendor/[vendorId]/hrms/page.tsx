import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { HrmsClientTable } from "./HrmsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { hrmsColumns } from "@/lib/sample-data/hrms";

registerPage({
  id: "hrms.list",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — List",
  path: "/vendor/[vendorId]/hrms",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every employee record for the hrms module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/hrms/page.tsx",
});

export default async function HrmsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("hrms");
  const columns = await applyCustomizations("hrms.list", hrmsColumns);

  return (
    <AppShell
      navGroups={await buildVendorNavGroups("hrms")}
      topbarTitle={mod?.label ?? "HRMS / Payroll"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/hrms/new`} className="btn-accent">
          + New Employee
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <HrmsClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

