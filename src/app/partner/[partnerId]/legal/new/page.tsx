import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { listLegalClients, LEGAL_MATTER_STATUSES } from "@/lib/legal";
import { createLegalMatterAction } from "../actions";

registerPage({
  id: "legal.create",
  moduleSlug: "legal",
  title: "Legal / Case Management — Create",
  path: "/partner/[partnerId]/legal/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "default-values", label: "Default values" },
  ],
  explanation:
    "Creation form for a new matter (LegalMatter — a real Prisma table), selecting a real LegalClient by id and auto-generating matterNumber via getNextNumber(\"legal.matter\", ...) on submit.",
  sourceFile: "src/app/partner/[partnerId]/legal/new/page.tsx",
});

export default async function NewLegalPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("legal");
  const clients = await listLegalClients(params.partnerId);

  const fields: FormFieldDef[] = [
    {
      key: "clientId",
      label: "Client",
      type: "select",
      required: true,
      options: clients.map((c) => c.id),
      optionLabels: Object.fromEntries(clients.map((c) => [c.id, c.name])),
      help: clients.length === 0 ? "No clients yet — add one from Legal > Clients first." : undefined,
    },
    { key: "title", label: "Title", type: "text", required: true },
    { key: "matterType", label: "Matter Type", type: "text", required: false },
    { key: "status", label: "Status", type: "select", required: true, options: [...LEGAL_MATTER_STATUSES] },
    { key: "openedDate", label: "Opened Date", type: "date", required: false },
  ];

  return (
    <AppShell topbarTitle={`New Matter — ${mod?.label ?? "Legal / Case Management"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Matter</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new matter record for Legal / Case Management.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Matter"
            action={createLegalMatterAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
