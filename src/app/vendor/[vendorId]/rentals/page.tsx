import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RentalsClientTable } from "./RentalsClientTable";

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

export default function RentalsPage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("rentals");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("rentals")}
      topbarTitle={mod?.label ?? "Rentals / Booking"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/rentals/new`} className="btn-accent">
          + New Booking
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RentalsClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

