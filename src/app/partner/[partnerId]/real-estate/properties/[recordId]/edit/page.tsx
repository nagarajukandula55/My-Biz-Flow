import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { propertyFormFields, propertyToRow } from "@/lib/sample-data/properties";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getProperty } from "@/lib/realEstateData";
import { updatePropertyAction } from "../../actions";

registerPage({
  id: "real-estate.properties.edit",
  moduleSlug: "real-estate",
  title: "Real Estate — Properties — Edit",
  path: "/partner/[partnerId]/real-estate/properties/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Property's real data.",
  sourceFile: "src/app/partner/[partnerId]/real-estate/properties/[recordId]/edit/page.tsx",
});

export default async function EditPropertyPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const property = await getProperty(params.partnerId, params.recordId);
  if (!property) notFound();
  const fields = await applyCustomizations("real-estate.properties.edit", propertyFormFields);
  const row = propertyToRow(property);

  return (
    <AppShell topbarTitle="Edit Property — Real Estate">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Property</h1>
        <p className="mt-1 text-sm text-text-muted">{property.address}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={row}
            submitLabel="Save changes"
            action={updatePropertyAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
