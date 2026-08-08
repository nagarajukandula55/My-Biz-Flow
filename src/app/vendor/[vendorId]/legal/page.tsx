import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { LegalClientTable } from "./LegalClientTable";
import { LegalNewButton } from "./LegalNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { legalColumns } from "@/lib/sample-data/legal";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "legal.list",
  moduleSlug: "legal",
  title: "Legal / Case Management — List",
  path: "/vendor/[vendorId]/legal",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every matter record for the legal module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/legal/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function LegalPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("legal");
  const columns = await applyCustomizations("legal.list", legalColumns);
  const rows = await listBusinessRecords(params.vendorId, "legal");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Legal / Case Management"}
      topbarActions={
        <LegalNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <LegalClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

