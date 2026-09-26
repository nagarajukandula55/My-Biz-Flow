import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getPropertyDetailFields, propertyToRow } from "@/lib/sample-data/properties";
import { getProperty } from "@/lib/realEstateData";

registerPage({
  id: "real-estate.properties.detail",
  moduleSlug: "real-estate",
  title: "Real Estate — Properties — Detail",
  path: "/partner/[partnerId]/real-estate/properties/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single Property, rendered via the shared RecordDetail component, with an Edit action.",
  sourceFile: "src/app/partner/[partnerId]/real-estate/properties/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const property = await getProperty(params.partnerId, params.recordId);
  if (!property) notFound();
  const row = propertyToRow(property);
  const fields = getPropertyDetailFields(row);
  const recordLabel = property.address;

  return (
    <AppShell topbarTitle="Real Estate — Properties">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Property detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/real-estate/properties`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/real-estate/properties/${params.recordId}/edit`} className="btn-outline">
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
