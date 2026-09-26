import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { getLocationFormFields } from "@/lib/sample-data/brand";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBrand } from "@/lib/brandData";
import { createLocationAction } from "../actions";

registerPage({
  id: "brand.locations.create",
  moduleSlug: "brand",
  title: "Brand — Locations — Create",
  path: "/partner/[partnerId]/brand/[recordId]/locations/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "Creation form for a new Location under one Brand, Prisma-backed.",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/locations/new/page.tsx",
});

export default async function NewBrandLocationPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const brand = await getBrand(params.partnerId, params.recordId);
  if (!brand) notFound();
  const formFields = await getLocationFormFields(params.partnerId);
  const fields = await applyCustomizations("brand.locations.create", formFields);

  return (
    <AppShell topbarTitle={`New Location — ${brand.name}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Location</h1>
        <p className="mt-1 text-sm text-text-muted">Create a new location under {brand.name}.</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            submitLabel="Create Location"
            action={createLocationAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
