import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { RealEstateClientTable } from "./RealEstateClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { realEstateColumns } from "@/lib/sample-data/real-estate";

registerPage({
  id: "real-estate.list",
  moduleSlug: "real-estate",
  title: "Real Estate — List",
  path: "/vendor/[vendorId]/real-estate",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every listing record for the real-estate module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/vendor/[vendorId]/real-estate/page.tsx",
});

export default async function RealEstatePage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("real-estate");
  const columns = await applyCustomizations("real-estate.list", realEstateColumns);

  return (
    <AppShell
      navGroups={await buildVendorNavGroups("real-estate")}
      topbarTitle={mod?.label ?? "Real Estate"}
      topbarActions={
        <Link href={`/vendor/${params.vendorId}/real-estate/new`} className="btn-accent">
          + New Listing
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <RealEstateClientTable vendorId={params.vendorId} columns={columns} />
        </div>
      </div>
    </AppShell>
  );
}

