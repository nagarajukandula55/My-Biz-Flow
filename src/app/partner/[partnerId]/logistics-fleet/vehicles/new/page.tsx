import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createVehicleAction } from "../actions";

registerPage({
  id: "logistics-fleet.vehicles.create",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — New Vehicle",
  path: "/partner/[partnerId]/logistics-fleet/vehicles/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Registers a new Vehicle (Prisma-backed) — vehicle number, active status — so it can be assigned to trips.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/vehicles/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "vehicleNumber", label: "Vehicle Number", type: "text", required: true, placeholder: "e.g. KA-05-AB-4471" },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function NewVehiclePage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");

  return (
    <AppShell topbarTitle={`New Vehicle — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Vehicle</h1>
        <p className="mt-1 text-sm text-text-muted">Register a new vehicle for this partner's fleet.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ isActive: true }}
            submitLabel="Create Vehicle"
            action={createVehicleAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
