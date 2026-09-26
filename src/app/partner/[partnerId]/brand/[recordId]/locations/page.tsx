import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LocationsClientTable } from "./LocationsClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { locationColumns, locationToRow } from "@/lib/sample-data/brand";
import { getBrand, listLocationsForBrand } from "@/lib/brandData";

registerPage({
  id: "brand.locations.list",
  moduleSlug: "brand",
  title: "Brand — Locations",
  path: "/partner/[partnerId]/brand/[recordId]/locations",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every Location under one Brand (Prisma-backed — see src/lib/brandData.ts), with a \"+ New\" action and row-click navigation into a Location's detail view.",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/locations/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BrandLocationsPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const brand = await getBrand(params.partnerId, params.recordId);
  if (!brand) notFound();
  const columns = await applyCustomizations("brand.locations.list", locationColumns);
  const locations = await listLocationsForBrand(params.partnerId, params.recordId);
  const rows = locations.map(locationToRow);

  return (
    <AppShell
      topbarTitle={`${brand.name} — Locations`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/brand/${params.recordId}/locations/new`} className="btn-accent">
          + New Location
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Every location under {brand.name}.</p>
        <div className="mt-2">
          <Link href={`/partner/${params.partnerId}/brand/${params.recordId}`} className="text-sm text-accent hover:underline">
            &larr; Back to {brand.name}
          </Link>
        </div>
        <div className="mt-6">
          <LocationsClientTable partnerId={params.partnerId} brandId={params.recordId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
