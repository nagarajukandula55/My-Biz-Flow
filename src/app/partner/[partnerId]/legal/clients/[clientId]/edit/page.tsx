import { AppShell } from "@/components/AppShell";
import { notFound } from "next/navigation";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { getLegalClient } from "@/lib/legal";
import { updateLegalClientAction } from "../../actions";

registerPage({
  id: "legal.clients.edit",
  moduleSlug: "legal",
  title: "Legal — Edit Client",
  path: "/partner/[partnerId]/legal/clients/[clientId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Edit form for an existing LegalClient, pre-populated from the real record.",
  sourceFile: "src/app/partner/[partnerId]/legal/clients/[clientId]/edit/page.tsx",
});

const clientFormFields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "contact", label: "Contact Number", type: "phone", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "address", label: "Address", type: "textarea", required: false },
];

export default async function EditLegalClientPage({ params }: { params: { partnerId: string; clientId: string } }) {
  const mod = await getModule("legal");
  const client = await getLegalClient(params.partnerId, params.clientId);
  if (!client) notFound();

  return (
    <AppShell topbarTitle={`Edit Client — ${mod?.label ?? "Legal / Case Management"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Client</h1>
        <p className="mt-1 text-sm text-text-muted">{client.name}</p>
        <div className="mt-6">
          <RecordForm
            fields={clientFormFields}
            initialValues={client}
            submitLabel="Save changes"
            action={updateLegalClientAction.bind(null, params.partnerId, params.clientId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
