import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RealEstateClientTable } from "./RealEstateClientTable";
import { RealEstateNewButton } from "./RealEstateNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { realEstateColumns } from "@/lib/sample-data/real-estate";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "real-estate.list",
  moduleSlug: "real-estate",
  title: "Real Estate — List",
  path: "/partner/[partnerId]/real-estate",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every listing record for the real-estate module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/real-estate/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RealEstatePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("real-estate");
  const columns = await applyCustomizations("real-estate.list", realEstateColumns);
  const rows = await listBusinessRecords(params.partnerId, "real-estate");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Real Estate"}
      topbarActions={
        <RealEstateNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RealEstateClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

