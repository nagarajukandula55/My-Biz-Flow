import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getLocationDetailFields, getLocationTimeline, locationRelated, locationColumns, locationToRow } from "@/lib/sample-data/brand";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBrand, getLocation } from "@/lib/brandData";

registerPage({
  id: "brand.locations.detail",
  moduleSlug: "brand",
  title: "Brand — Locations — Detail",
  path: "/partner/[partnerId]/brand/[recordId]/locations/[locationId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single Location under a Brand, rendered via the shared RecordDetail component, with an Edit action.",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/locations/[locationId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BrandLocationDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string; locationId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const brand = await getBrand(params.partnerId, params.recordId);
  if (!brand) notFound();
  const location = await getLocation(params.partnerId, params.recordId, params.locationId);
  if (!location) notFound();
  const row = locationToRow(location);
  const fields = await applyCustomizationsToDetailFields("brand.locations.detail", getLocationDetailFields(row), locationColumns);
  const timeline = getLocationTimeline(row);
  const recordLabel = location.locationName;

  return (
    <AppShell topbarTitle={`${brand.name} — Locations`}>
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          timeline={timeline}
          related={locationRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Location detail — {brand.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/brand/${params.recordId}/locations`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/brand/${params.recordId}/locations/${params.locationId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
