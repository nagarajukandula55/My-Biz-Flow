import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { StatusChip, type StatusVariant } from "@/components/StatusChip";
import { formatDate, formatDateTime, formatCurrencyINR } from "@/lib/format";
import { DataTable } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAsset } from "@/lib/rentals";
import { updateAssetAction, maintenanceAction } from "../actions";
import { rentalAssetPolicyFields, rentalLocalDateTime } from "@/lib/rentalAssetPolicy";

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
  ...rentalAssetPolicyFields,
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
            initialValues={{ assetName: asset.assetName, isActive: asset.isActive, ...asset.policy,
              maintenanceStart: rentalLocalDateTime(asset.policy.maintenanceStart), maintenanceEnd: rentalLocalDateTime(asset.policy.maintenanceEnd) }}
            submitLabel="Save changes"
            action={updateAssetAction.bind(null, params.partnerId, asset.id)}
          />
        </div>

        <section className="mt-8" aria-label="Maintenance schedule">
          <h2 className="font-display text-xl font-bold text-text">Additional maintenance windows</h2>
          <p className="my-3 text-sm text-text-muted">Schedule separate maintenance periods for the entire pool. Existing bookings and cleaning time are protected. The original maintenance period remains editable in the asset profile above.</p>
          <DataTable columns={[{ key: "start", label: "Starts (IST)", type: "text" }, { key: "end", label: "Ends (IST)", type: "text" }, { key: "notes", label: "Notes", type: "text" }]} rows={asset.maintenanceWindows.map(window => ({ id: window.start, start: formatDateTime(window.start), end: formatDateTime(window.end), notes: window.notes }))} />
          <RecordForm fields={[
            { key: "scheduleStart", label: "New maintenance starts (IST)", type: "datetime", required: true },
            { key: "scheduleEnd", label: "New maintenance ends (IST)", type: "datetime", required: true },
            { key: "scheduleNotes", label: "New maintenance notes", type: "textarea" },
          ]} submitLabel="Schedule maintenance" action={maintenanceAction.bind(null, params.partnerId, asset.id, false)} />
          {asset.maintenanceWindows.length > 0 && <RecordForm fields={[{ key: "start", label: "Maintenance window to remove", type: "select", required: true, options: asset.maintenanceWindows.map(window => window.start), optionLabels: Object.fromEntries(asset.maintenanceWindows.map(window => [window.start, `${formatDateTime(window.start)} → ${formatDateTime(window.end)}`])) }]} submitLabel="Remove selected window" action={maintenanceAction.bind(null, params.partnerId, asset.id, true)} />}
        </section>
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
                  <div className="font-medium text-text">{a.renter} · {a.quantity} unit(s)</div>
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
