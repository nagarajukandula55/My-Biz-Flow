import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { propertyFormFields } from "@/lib/sample-data/properties";
import { applyCustomizations } from "@/lib/designer/customizations";
import { createPropertyAction } from "../actions";

registerPage({
  id: "real-estate.properties.create",
  moduleSlug: "real-estate",
  title: "Real Estate — Properties — Create",
  path: "/partner/[partnerId]/real-estate/properties/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "Creation form for a new Property (listing), Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/real-estate/properties/new/page.tsx",
});

export default async function NewPropertyPage({ params }: { params: { partnerId: string } }) {
  const fields = await applyCustomizations("real-estate.properties.create", propertyFormFields);

  return (
    <AppShell topbarTitle="New Property — Real Estate">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Property</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new listing record.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Property"
            action={createPropertyAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
