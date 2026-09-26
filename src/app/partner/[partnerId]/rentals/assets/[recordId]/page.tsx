import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { formatDate, formatCurrencyINR } from "@/lib/format";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAsset } from "@/lib/rentals";
import { updateAssetAction } from "../actions";

registerPage({
  id: "rentals.assets.detail",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Asset Detail",
  path: "/partner/[partnerId]/rentals/assets/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Asset detail fields" },
    { key: "agreement-history", label: "Booking history" },
  ],
  explanation: "A rental asset's own profile (editable in place via RecordForm — name/active toggle) plus its full RentalAgreement booking history, most recent first.",
  sourceFile: "src/app/partner/[partnerId]/rentals/assets/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "assetName", label: "Asset / Venue Name", type: "text", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "warning",
  Confirmed: "teal",
  Ongoing: "amber",
  Completed: "success",
  Cancelled: "danger",
};

export default async function RentalAssetDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const asset = await getAsset(params.partnerId, params.recordId);
  if (!asset) notFound();

  return (
    <AppShell topbarTitle={`${asset.assetName} — ${mod?.label ?? "Rentals / Booking"}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{asset.assetName}</h1>
            <p className="mt-1 text-xs text-text-muted">Asset profile</p>
          </div>
          <Link href={`/partner/${params.partnerId}/rentals/assets`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ assetName: asset.assetName, isActive: asset.isActive }}
            submitLabel="Save changes"
            action={updateAssetAction.bind(null, params.partnerId, asset.id)}
          />
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-text">Bookings</h2>
            <Link href={`/partner/${params.partnerId}/rentals/new?assetId=${asset.id}`} className="btn-outline">
              + New Booking
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {asset.agreements.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No bookings yet.
              </p>
            )}
            {asset.agreements.map((a) => (
              <Link
                key={a.id}
                href={`/partner/${params.partnerId}/rentals/${a.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-4 py-3 text-sm hover:border-accent"
              >
                <div>
                  <div className="font-medium text-text">{a.renter}</div>
                  <div className="text-xs text-text-muted">
                    {formatDate(a.bookingStart.toISOString())} &ndash; {formatDate(a.bookingEnd.toISOString())}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-muted">{formatCurrencyINR(a.rentalAmount / 100)}</span>
                  <StatusChip label={a.status} variant={STATUS_VARIANT[a.status] ?? "neutral"} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
