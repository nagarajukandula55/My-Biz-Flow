import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { getWorkCenter } from "@/lib/manufacturing";
import { updateWorkCenterAction } from "../../actions";

registerPage({
  id: "manufacturing.work-centers.detail",
  moduleSlug: "manufacturing",
  title: "Manufacturing — Edit Work Center",
  path: "/partner/[partnerId]/manufacturing/work-centers/[recordId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing WorkCenter's name/capacity/active flag.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/work-centers/[recordId]/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "capacityPerDay", label: "Capacity / Day", type: "number", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export const dynamic = "force-dynamic";

export default async function EditWorkCenterPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const workCenter = await getWorkCenter(params.partnerId, params.recordId);
  if (!workCenter) notFound();

  return (
    <AppShell topbarTitle="Edit Work Center">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text">{workCenter.name}</h1>
          <Link href={`/partner/${params.partnerId}/manufacturing/work-centers`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ name: workCenter.name, capacityPerDay: workCenter.capacityPerDay ?? "", isActive: workCenter.isActive }}
            submitLabel="Save changes"
            action={updateWorkCenterAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
