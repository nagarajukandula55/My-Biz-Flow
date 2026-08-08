import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RentalsClientTable } from "./RentalsClientTable";
import { RentalsNewButton } from "./RentalsNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { rentalsColumns } from "@/lib/sample-data/rentals";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "rentals.list",
  moduleSlug: "rentals",
  title: "Rentals / Booking — List",
  path: "/vendor/[vendorId]/rentals",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every booking record for the rentals module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/rentals/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function RentalsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("rentals");
  const columns = await applyCustomizations("rentals.list", rentalsColumns);
  const rows = await listBusinessRecords(params.vendorId, "rentals");

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Rentals / Booking"}
      topbarActions={
        <RentalsNewButton vendorId={params.vendorId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RentalsClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

