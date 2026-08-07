import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { MarketplaceClientTable } from "./MarketplaceClientTable";

registerPage({
  id: "marketplace.list",
  moduleSlug: "marketplace",
  title: "Marketplace / Vendor Aggregator — List",
  path: "/vendor/[vendorId]/marketplace",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every vendor listing record for the marketplace module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/marketplace/page.tsx",
});

export default function MarketplacePage({ params }: { params: { vendorId: string } }) {
  const mod = getModule("marketplace");

  return (
    <AppShell
      navGroups={buildVendorNavGroups("marketplace")}
      topbarTitle={mod?.label ?? "Marketplace / Vendor Aggregator"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/marketplace/new`} className="btn-accent">
          + New Vendor Listing
        </Link>
      }
    >
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">{mod?.label}</h1>
        <p className="mt-1 text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <MarketplaceClientTable vendorId={params.vendorId} />
        </div>
      </div>
    </AppShell>
  );
}

