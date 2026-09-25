import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createOfficeLocationAction } from "../actions";

registerPage({
  id: "hrms.office-locations.create",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — New Office Location",
  path: "/partner/[partnerId]/hrms/office-locations/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Registers a new OfficeLocation — name, lat, lng, geofence radius (meters) — used to validate live attendance check-ins.",
  sourceFile: "src/app/partner/[partnerId]/hrms/office-locations/new/page.tsx",
});

const fields: FormFieldDef[] = [
  { key: "name", label: "Name", type: "text", required: true },
  { key: "lat", label: "Latitude", type: "number", required: true, placeholder: "e.g. 17.385044" },
  { key: "lng", label: "Longitude", type: "number", required: true, placeholder: "e.g. 78.486671" },
  { key: "geofenceRadiusMeters", label: "Geofence Radius (meters)", type: "number", required: false, placeholder: "200" },
];

export default async function NewOfficeLocationPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("hrms");

  return (
    <AppShell topbarTitle={`New Office Location — ${mod?.label ?? "HRMS / Payroll"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Office Location</h1>
        <div className="mt-6">
          <RecordForm fields={fields} submitLabel="Create Office Location" action={createOfficeLocationAction.bind(null, params.partnerId)} />
        </div>
      </div>
    </AppShell>
  );
}
