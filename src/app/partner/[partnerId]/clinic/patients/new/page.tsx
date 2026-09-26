import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createPatientAction } from "../actions";

registerPage({
  id: "clinic.patients.create",
  moduleSlug: "clinic",
  title: "Clinic — New Patient",
  path: "/partner/[partnerId]/clinic/patients/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Registers a new Patient (Prisma-backed) — name, phone, email, insurance provider — so appointments can be booked against them.",
  sourceFile: "src/app/partner/[partnerId]/clinic/patients/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Patient Name", type: "text", required: true },
  { key: "phone", label: "Phone", type: "phone", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "insuranceProvider", label: "Insurance Provider", type: "text", required: false },
];

export default async function NewClinicPatientPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("clinic");

  return (
    <AppShell topbarTitle={`New Patient — ${mod?.label ?? "Clinic"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Patient</h1>
        <p className="mt-1 text-sm text-text-muted">Register a new patient for this clinic.</p>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Patient" action={createPatientAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
