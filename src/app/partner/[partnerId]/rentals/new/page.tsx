import { rentalTermsFields } from "@/lib/rentalTerms";
import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { type FormFieldDef } from "@/components/RecordForm";
import { RentalBookingForm } from "@/components/RentalBookingForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listActiveAssets, RENTAL_AGREEMENT_STATUSES } from "@/lib/rentals";
import { createAgreementAction } from "../actions";

registerPage({
  id: "rentals.create",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Create",
  path: "/partner/[partnerId]/rentals/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "A config-driven creation form for a new RentalAgreement booking, optionally against a catalog RentalAsset, built via the shared RecordForm component. Submission runs createAgreementAction, which rejects the save server-side if the chosen asset already has an overlapping booking before persisting.",
  sourceFile: "src/app/partner/[partnerId]/rentals/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewRentalsPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { assetId?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const assets = await listActiveAssets(params.partnerId);
  const preselected = assets.find((a) => a.id === searchParams?.assetId);

  const fields: FormFieldDef[] = [
    ...(assets.length > 0
      ? [
          {
            key: "assetId",
            label: "Catalog Asset (optional)",
            type: "select" as const,
            required: false,
            options: assets.map((a) => a.id),
            optionLabels: Object.fromEntries(assets.map((a) => [a.id, a.assetName])),
          },
        ]
      : []),
    { key: "assetName", label: "Asset / Venue Name", type: "text", required: true },
    { key: "renter", label: "Renter", type: "text", required: true },
    { key: "additionalAssetIds", label: "Additional catalog assets (optional, up to 19)", type: "multi-select", options: assets.map(a => a.id), optionLabels: Object.fromEntries(assets.map(a => [a.id, a.assetName])), help: "Select a primary catalog asset above; do not select it again here. Prices, rates and deposits apply separately to every item. Optional price overrides for selected additional items appear below." },
    { key: "bookingStart", label: "Booking Start (IST)", type: "datetime", required: true },
    { key: "bookingEnd", label: "Booking End (IST)", type: "datetime", required: true },
    { key: "depositAmountRupees", label: "Deposit Amount", type: "currency", required: false },
    { key: "rentalAmountRupees", label: "Fixed quote amount (ignored for calculated pricing)", type: "currency", required: false },
    ...rentalTermsFields,
    { key: "status", label: "Status", type: "select", required: false, options: RENTAL_AGREEMENT_STATUSES },
  ];

  return (
    <AppShell topbarTitle={`New Booking — ${mod?.label ?? "Rentals / Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Booking</h1>
        <p className="mt-1 text-sm text-text-muted">Book one asset pool or up to 20 catalog pools together. Quantity must fit each pool's capacity. Fixed quotes and deposits are totals per line; calculated rates are per unit. Record partial pickups and returns on the booking detail. Deposits settle once every unit is returned or released. Calculated pricing rounds partial periods up; a 30-day period is not a calendar-month lease.</p>
        <div className="mt-6">
          <RentalBookingForm
            fields={fields}
            initialValues={preselected ? { assetId: preselected.id, assetName: preselected.assetName } : undefined}
            assets={assets.map(asset => ({ id: asset.id, assetName: asset.assetName }))}
            action={createAgreementAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
