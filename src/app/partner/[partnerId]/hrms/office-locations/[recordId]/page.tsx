import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getOfficeLocation } from "@/lib/hrms";
import { updateOfficeLocationAction } from "../actions";

registerPage({
  id: "hrms.office-locations.edit",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Edit Office Location",
  path: "/partner/[partnerId]/hrms/office-locations/[recordId]",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing OfficeLocation's name, lat/lng, and geofence radius.",
  sourceFile: "src/app/partner/[partnerId]/hrms/office-locations/[recordId]/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "lat", label: "Latitude", type: "number", required: true },
  { key: "lng", label: "Longitude", type: "number", required: true },
  { key: "geofenceRadiusMeters", label: "Geofence Radius (meters)", type: "number", required: false },
];

export default async function EditOfficeLocationPage({ params }: { params: { partnerId: string; recordId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");
  const location = await getOfficeLocation(params.partnerId, params.recordId);
  if (!location) notFound();

  return (
    <AppShell topbarTitle={`Edit Office Location — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-text">Edit Office Location</h1>
          <Link href={`/partner/${params.partnerId}/hrms/office-locations`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ name: location.name, lat: location.lat, lng: location.lng, geofenceRadiusMeters: location.geofenceRadiusMeters }}
            submitLabel="Save changes"
            action={updateOfficeLocationAction.bind(null, params.partnerId, location.id)}
          />
        </div>
      </div>
    </AppShell>
  );
}
