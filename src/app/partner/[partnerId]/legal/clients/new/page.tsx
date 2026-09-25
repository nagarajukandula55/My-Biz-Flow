import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { createLegalClientAction } from "../actions";

registerPage({
  id: "legal.clients.create",
  moduleSlug: "legal",
  title: "Legal — New Client",
  path: "/partner/[partnerId]/legal/clients/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [{ key: "form-fields", label: "Form fields" }],
  explanation: "Creation form for a LegalClient (name/contact/email/address) — a real Prisma-backed record.",
  sourceFile: "src/app/partner/[partnerId]/legal/clients/new/page.tsx",
});

const clientFormFields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "contact", label: "Contact Number", type: "phone", required: false },
  { key: "email", label: "Email", type: "email", required: false },
  { key: "address", label: "Address", type: "textarea", required: false },
];

export default async function NewLegalClientPage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("legal");

  return (
    <AppShell topbarTitle={`New Client — ${mod?.label ?? "Legal / Case Management"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Client</h1>
        <p className="mt-1 text-sm text-text-muted">Add a new client to the legal module.</p>
        <div className="mt-6">
          <RecordForm
            fields={clientFormFields}
            submitLabel="Create Client"
            action={createLegalClientAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
