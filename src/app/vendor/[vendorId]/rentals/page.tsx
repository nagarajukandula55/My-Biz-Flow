import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RentalsClientTable } from "./RentalsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { rentalsColumns } from "@/lib/sample-data/rentals";

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

export default async function RentalsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("rentals");
  const columns = await applyCustomizations("rentals.list", rentalsColumns);

  return (
    <AppShell
      topbarTitle={mod?.label ?? "Rentals / Booking"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/rentals/new`} className="btn-accent">
          + New Booking
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RentalsClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

