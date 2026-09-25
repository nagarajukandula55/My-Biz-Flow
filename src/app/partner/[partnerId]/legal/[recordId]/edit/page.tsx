import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { getLegalMatter, listLegalClients, LEGAL_MATTER_STATUSES } from "@/lib/legal";
import { updateLegalMatterAction } from "../actions";

registerPage({
  id: "legal.edit",
  moduleSlug: "legal",
  title: "Legal / Case Management — Edit",
  path: "/partner/[partnerId]/legal/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing matter (LegalMatter — a real Prisma table), pre-populated from the real record.",
  sourceFile: "src/app/partner/[partnerId]/legal/[recordId]/edit/page.tsx",
});

export default async function EditLegalPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("legal");
  const [record, clients] = await Promise.all([
    getLegalMatter(params.partnerId, params.recordId),
    listLegalClients(params.partnerId),
  ]);
  if (!record) notFound();

  const fields: FormFieldDef[] = [
    {
      key: "clientId",
      label: "Client",
      type: "select",
      required: true,
      options: clients.map((c) => c.id),
      optionLabels: Object.fromEntries(clients.map((c) => [c.id, c.name])),
    },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "matterType", label: "Matter Type", type: "text", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: [...LEGAL_MATTER_STATUSES] },
    { key: "openedDate", label: "Opened Date", type: "date", required: false },
  ];

  return (
    <AppShell topbarTitle={`Edit Matter — ${mod?.label ?? "Legal / Case Management"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Matter</h1>
        <p className="mt-1 text-sm text-text-muted">{record.matterNumber}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateLegalMatterAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
