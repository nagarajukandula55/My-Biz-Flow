import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { rentalsFormFields } from "@/lib/sample-data/rentals";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "rentals.create",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Create",
  path: "/vendor/[vendorId]/rentals/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new booking in the rentals module, built from the module's real field set via the shared RecordForm component. Submission is a client-side demo stub — no backend is wired up in this pass.",
  sourceFile: "src/app/vendor/[vendorId]/rentals/new/page.tsx",
});

export default async function NewRentalsPage({ params }: { params: { vendorId: string } }) {
  const mod = await getModule("rentals");
  const fields = await applyCustomizations("rentals.create", rentalsFormFields);

  return (
    <AppShell topbarTitle={`New Booking — ${mod?.label ?? "Rentals / Booking"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Booking</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new booking record for Rentals / Booking.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Booking"
            action={createBusinessRecordAction.bind(null, params.vendorId, "rentals")}
          />
        </div>
      </div>
    </AppShell>
  );
}
