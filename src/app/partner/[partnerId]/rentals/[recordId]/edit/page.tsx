import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAgreement, listActiveAssets, RENTAL_AGREEMENT_STATUSES } from "@/lib/rentals";
import { updateAgreementAction } from "../../actions";

registerPage({
  id: "rentals.edit",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Edit",
  path: "/partner/[partnerId]/rentals/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing RentalAgreement's real data, letting a user edit or reschedule it. Submission runs updateAgreementAction, which re-checks the asset's booking window for conflicts (excluding this agreement itself) before saving.",
  sourceFile: "src/app/partner/[partnerId]/rentals/[recordId]/edit/page.tsx",
});

export const dynamic = "force-dynamic";

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function EditRentalsPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const agreement = await getAgreement(params.partnerId, params.recordId);
  if (!agreement) notFound();
  const assets = await listActiveAssets(params.partnerId);

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
    { key: "bookingStart", label: "Booking Start", type: "date", required: true },
    { key: "bookingEnd", label: "Booking End", type: "date", required: true },
    { key: "depositAmountRupees", label: "Deposit Amount", type: "currency", required: false },
    { key: "rentalAmountRupees", label: "Rental Amount", type: "currency", required: true },
    { key: "status", label: "Status", type: "select", required: false, options: RENTAL_AGREEMENT_STATUSES },
  ];

  return (
    <AppShell topbarTitle={`Edit Booking — ${mod?.label ?? "Rentals / Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Booking</h1>
        <p className="mt-1 text-sm text-text-muted">{agreement.assetName} &middot; {agreement.renter}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{
              assetId: agreement.assetId ?? undefined,
              assetName: agreement.assetName,
              renter: agreement.renter,
              bookingStart: toDateInput(agreement.bookingStart),
              bookingEnd: toDateInput(agreement.bookingEnd),
              depositAmountRupees: agreement.depositAmount / 100,
              rentalAmountRupees: agreement.rentalAmount / 100,
              status: agreement.status,
            }}
            submitLabel="Save changes"
            action={updateAgreementAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
