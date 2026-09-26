import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createDriverAction } from "../actions";

registerPage({
  id: "logistics-fleet.drivers.create",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — New Driver",
  path: "/partner/[partnerId]/logistics-fleet/drivers/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Registers a new Driver (Prisma-backed) — name, phone, active status — so they can be assigned to trips.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/drivers/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Driver Name", type: "text", required: true },
  { key: "phone", label: "Phone", type: "phone", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function NewDriverPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");

  return (
    <AppShell topbarTitle={`New Driver — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Driver</h1>
        <p className="mt-1 text-sm text-text-muted">Register a new driver for this partner's fleet.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ isActive: true }}
            submitLabel="Create Driver"
            action={createDriverAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
