import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { realEstateFormFields } from "@/lib/sample-data/real-estate";
import { applyCustomizations } from "@/lib/designer/customizations";
import { listProperties } from "@/lib/realEstateData";
import { createEnquiryAction } from "../[recordId]/actions";

registerPage({
  id: "real-estate.create",
  moduleSlug: "real-estate",
  title: "Real Estate — Create",
  path: "/partner/[partnerId]/real-estate/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A config-driven creation form for a new Enquiry (lead) in the real-estate module, built from the module's real field set via the shared RecordForm component — Prisma-backed. The Property field is populated from the partner's real Property rows (properties/ sub-page).",
  sourceFile: "src/app/partner/[partnerId]/real-estate/new/page.tsx",
});

export default async function NewRealEstatePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("real-estate");
  const fields = await applyCustomizations("real-estate.create", realEstateFormFields);
  const properties = await listProperties(params.partnerId);
  const fieldsWithPropertyOptions: FormFieldDef[] = fields.map((f) =>
    f.key === "propertyId"
      ? {
          ...f,
          options: properties.map((p) => p.id),
          optionLabels: Object.fromEntries(properties.map((p) => [p.id, p.address])),
        }
      : f
  );

  return (
    <AppShell topbarTitle={`New Enquiry — ${mod?.label ?? "Real Estate"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Enquiry</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new lead/enquiry record for Real Estate.</p>
        <div className="mt-6">
          <RecordForm
            fields={fieldsWithPropertyOptions}
            submitLabel="Create Enquiry"
            action={createEnquiryAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
