import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { realEstateFormFields, enquiryToRow } from "@/lib/sample-data/real-estate";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getEnquiry, listProperties } from "@/lib/realEstateData";
import { updateEnquiryAction } from "../actions";

registerPage({
  id: "real-estate.edit",
  moduleSlug: "real-estate",
  title: "Real Estate — Edit",
  path: "/partner/[partnerId]/real-estate/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Enquiry's real data, letting a user edit and save changes — Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/real-estate/[recordId]/edit/page.tsx",
});

export default async function EditRealEstatePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("real-estate");
  const enquiry = await getEnquiry(params.partnerId, params.recordId);
  if (!enquiry) notFound();
  const fields = await applyCustomizations("real-estate.edit", realEstateFormFields);
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
  const row = enquiryToRow(enquiry);

  return (
    <AppShell topbarTitle={`Edit Enquiry — ${mod?.label ?? "Real Estate"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Enquiry</h1>
        <p className="mt-1 text-sm text-text-muted">{String(row["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fieldsWithPropertyOptions}
            initialValues={row}
            submitLabel="Save changes"
            action={updateEnquiryAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
