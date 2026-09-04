import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { salonSpaFormFields } from "@/lib/sample-data/salon-spa";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateSalonSpaBookingAction } from "../actions";

registerPage({
  id: "salon-spa.edit",
  moduleSlug: "salon-spa",
  title: "Salon & Spa — Edit",
  path: "/partner/[partnerId]/salon-spa/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing booking's real data, letting a user edit or reschedule it. Submission runs updateSalonSpaBookingAction, which re-checks the stylist's schedule for conflicts (excluding this booking itself) before saving. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/salon-spa/[recordId]/edit/page.tsx",
});

export default async function EditSalonSpaPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams: { conflict?: string };
}) {
  const mod = await getModule("salon-spa");
  const record = await getBusinessRecord(params.partnerId, "salon-spa", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("salon-spa.edit", salonSpaFormFields);

  return (
    <AppShell topbarTitle={`Edit Booking — ${mod?.label ?? "Salon & Spa"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Booking</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        {searchParams.conflict && (
          <div className="mt-4 rounded-md border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {searchParams.conflict}
          </div>
        )}
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateSalonSpaBookingAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
