import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createAssetAction } from "../actions";

registerPage({
  id: "rentals.assets.create",
  moduleSlug: "rentals",
  title: "Rentals / Booking — New Asset",
  path: "/partner/[partnerId]/rentals/assets/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Registers a new RentalAsset (Prisma-backed) — the rentable catalog entry — so bookings can be made against it.",
  sourceFile: "src/app/partner/[partnerId]/rentals/assets/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "assetName", label: "Asset / Venue Name", type: "text", required: true },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function NewRentalAssetPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");

  return (
    <AppShell topbarTitle={`New Asset — ${mod?.label ?? "Rentals / Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Asset</h1>
        <p className="mt-1 text-sm text-text-muted">Add a new rentable asset/venue to the catalog.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ isActive: true }}
            submitLabel="Create Asset"
            action={createAssetAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
