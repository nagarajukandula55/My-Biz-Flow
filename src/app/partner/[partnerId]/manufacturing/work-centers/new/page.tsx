import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { createWorkCenterAction } from "../../actions";

registerPage({
  id: "manufacturing.work-centers.create",
  moduleSlug: "manufacturing",
  title: "Manufacturing — New Work Center",
  path: "/partner/[partnerId]/manufacturing/work-centers/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new WorkCenter (Prisma-backed) that a Production Order can be scheduled against.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/work-centers/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "capacityPerDay", label: "Capacity / Day", type: "number", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function NewWorkCenterPage({ params }: { params: { partnerId: string } }) {
  return (
    <AppShell topbarTitle="New Work Center">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Work Center</h1>
        <p className="mt-1 text-sm text-text-muted">Add a production line/station for Manufacturing / Production.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ isActive: true }}
            submitLabel="Create Work Center"
            action={createWorkCenterAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
