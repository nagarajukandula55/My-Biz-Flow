import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { SalonSpaClientTable } from "./SalonSpaClientTable";
import { SalonSpaNewButton } from "./SalonSpaNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { salonSpaColumns } from "@/lib/sample-data/salon-spa";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "salon-spa.list",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — List",
  path: "/partner/[partnerId]/salon-spa",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every booking record for the salon-spa module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view. Real data — Prisma-backed (BusinessRecord table, scoped to this partner).",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function SalonSpaPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("salon-spa");
  const columns = await applyCustomizations("salon-spa.list", salonSpaColumns);
  const rows = await listBusinessRecords(params.partnerId, "salon-spa");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Salon & Spa"}
      topbarActions={<SalonSpaNewButton partnerId={params.partnerId} />}
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <SalonSpaClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
