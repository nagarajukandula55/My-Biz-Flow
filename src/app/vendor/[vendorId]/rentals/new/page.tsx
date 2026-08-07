import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { rentalsFormFields } from "@/lib/sample-data/rentals";
import { applyCustomizations } from "@/lib/designer/customizations";

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

export default function NewRentalsPage() {
  const mod = getModule("rentals");
  const fields = applyCustomizations("rentals.create", rentalsFormFields);

  return (
    <AppShell navGroups={buildVendorNavGroups("rentals")} topbarTitle={`New Booking — ${mod?.label ?? "Rentals / Booking"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">New Booking</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new booking record for Rentals / Booking.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Booking" />
        </div>
      </div>
    </AppShell>
  );
}
