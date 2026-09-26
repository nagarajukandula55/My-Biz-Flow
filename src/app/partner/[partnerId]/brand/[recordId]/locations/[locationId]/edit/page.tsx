import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { getLocationFormFields, locationToRow } from "@/lib/sample-data/brand";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBrand, getLocation } from "@/lib/brandData";
import { updateLocationAction } from "../../actions";

registerPage({
  id: "brand.locations.edit",
  moduleSlug: "brand",
  title: "Brand — Locations — Edit",
  path: "/partner/[partnerId]/brand/[recordId]/locations/[locationId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing Location's real data (Prisma-backed).",
  sourceFile: "src/app/partner/[partnerId]/brand/[recordId]/locations/[locationId]/edit/page.tsx",
});

export default async function EditBrandLocationPage({
  params,
}: {
  params: { partnerId: string; recordId: string; locationId: string };
}) {
  const brand = await getBrand(params.partnerId, params.recordId);
  if (!brand) notFound();
  const location = await getLocation(params.partnerId, params.recordId, params.locationId);
  if (!location) notFound();
  const formFields = await getLocationFormFields(params.partnerId);
  const fields = await applyCustomizations("brand.locations.edit", formFields);
  const row = locationToRow(location);

  return (
    <AppShell topbarTitle={`Edit Location — ${brand.name}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Location</h1>
        <p className="mt-1 text-sm text-text-muted">{location.locationName}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={row}
            submitLabel="Save changes"
            action={updateLocationAction.bind(null, params.partnerId, params.recordId, params.locationId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
