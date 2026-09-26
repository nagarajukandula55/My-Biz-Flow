import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DataTable } from "@/components/DataTable";
import { getBrandDetailFields, getBrandTimeline, brandRelated, brandColumns, brandToRow, locationColumns, locationToRow, type AccessScope } from "@/lib/sample-data/brand";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBrand, listLocationsForBrand, computeBrandRollup } from "@/lib/brandData";
import { listBusinessRecords } from "@/lib/businessRecords";
import { BrandLifecycle } from "./BrandLifecycle";

registerPage({
  id: "brand.detail",
  moduleSlug: "brand",
  title: "Brand — Detail",
  path: "/partner/[partnerId]/brand/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single Brand (Prisma-backed), rendered via the shared RecordDetail component (field grid + activity timeline), with Edit action in the header. The BrandLifecycle panel above it carries the real domain logic: an aggregated performance rollup across every Location under this Brand, and cross-location role assignment marking each of this partner's Users as brand-wide or single-location access. Below the field grid, a nested Locations table lists every Location under this Brand with a link into the full Location management view.",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BrandDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("brand");
  const brand = await getBrand(params.partnerId, params.recordId);
  if (!brand) notFound();
  const row = brandToRow(brand);
  const fields = await applyCustomizationsToDetailFields("brand.detail", getBrandDetailFields(row), brandColumns);
  const timeline = getBrandTimeline(row);
  const recordLabel = brand.name;

  const locations = await listLocationsForBrand(params.partnerId, params.recordId);
  const rollup = computeBrandRollup(locations);
  const locationRows = locations.map(locationToRow);

  const userRecords = await listBusinessRecords(params.partnerId, "users");
  const users = userRecords.map((u) => ({
    id: String(u["id"]),
    accessScope: (u["accessScope"] as AccessScope) ?? "single-location",
  }));

  return (
    <AppShell topbarTitle={mod?.label ?? "Brand"}>
      <div>
        <BrandLifecycle
          partnerId={params.partnerId}
          brandRecordId={params.recordId}
          brandName={recordLabel}
          rollup={rollup}
          users={users}
        />

        <div className="mt-8">
          <RecordDetail
            fields={fields}
            recordLabel={recordLabel}
            searchParams={searchParams}
            timeline={timeline}
            related={brandRelated}
            headerSlot={
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Brand detail</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={`/partner/${params.partnerId}/brand`} className="btn-outline">
                    &larr; Back
                  </Link>
                  <Link href={`/partner/${params.partnerId}/brand/${params.recordId}/edit`} className="btn-outline">
                    Edit
                  </Link>
                </div>
              </div>
            }
          />
        </div>

        <div className="mt-8 rounded-md border border-border bg-bg-raised p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-text">Locations</h2>
            <div className="flex items-center gap-3">
              <Link href={`/partner/${params.partnerId}/brand/${params.recordId}/locations/new`} className="btn-outline text-xs">
                + New Location
              </Link>
              <Link href={`/partner/${params.partnerId}/brand/${params.recordId}/locations`} className="btn-outline text-xs">
                Manage Locations
              </Link>
            </div>
          </div>
          <div className="mt-3">
            {locationRows.length === 0 ? (
              <p className="text-sm text-text-muted">No locations under this brand yet.</p>
            ) : (
              <DataTable columns={locationColumns} rows={locationRows} />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
