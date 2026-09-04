import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { clinicFormFields } from "@/lib/sample-data/clinic";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateClinicAppointmentAction } from "../actions";

registerPage({
  id: "clinic.edit",
  moduleSlug: "clinic",
  title: "Clinic — Edit",
  path: "/partner/[partnerId]/clinic/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing appointment's real data, letting a user edit or reschedule it. Submission runs updateClinicAppointmentAction, which re-checks the doctor's slot for conflicts (excluding this appointment itself) before saving a rescheduled date/time.",
  sourceFile: "src/app/partner/[partnerId]/clinic/[recordId]/edit/page.tsx",
});

export default async function EditClinicPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams: { conflict?: string };
}) {
  const mod = await getModule("clinic");
  const record = await getBusinessRecord(params.partnerId, "clinic", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("clinic.edit", clinicFormFields);

  return (
    <AppShell topbarTitle={`Edit Appointment — ${mod?.label ?? "Clinic"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Appointment</h1>
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
            action={updateClinicAppointmentAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
