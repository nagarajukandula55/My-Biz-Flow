import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordForm, type FormFieldDef } from "@/components/RecordForm";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getDriver } from "@/lib/logisticsFleet";
import { updateDriverAction } from "../actions";

registerPage({
  id: "logistics-fleet.drivers.detail",
  moduleSlug: "logistics-fleet",
  title: "Logistics / Fleet — Driver Detail",
  path: "/partner/[partnerId]/logistics-fleet/drivers/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Driver detail fields" },
    { key: "trip-history", label: "Trip history" },
  ],
  explanation: "A driver's own profile (editable in place via RecordForm — name/phone/active status) plus their Trip history.",
  sourceFile: "src/app/partner/[partnerId]/logistics-fleet/drivers/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const fields: FormFieldDef[] = [
  { key: "name", label: "Driver Name", type: "text", required: true },
  { key: "phone", label: "Phone", type: "phone", required: false },
  { key: "isActive", label: "Active", type: "boolean", required: false },
];

export default async function DriverDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("logistics-fleet");
  const driver = await getDriver(params.partnerId, params.recordId);
  if (!driver) notFound();

  return (
    <AppShell topbarTitle={`${driver.name} — ${mod?.label ?? "Logistics / Fleet"}`}>
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{driver.name}</h1>
            <p className="mt-1 text-xs text-text-muted">Driver profile</p>
          </div>
          <Link href={`/partner/${params.partnerId}/logistics-fleet/drivers`} className="btn-outline">
            &larr; Back
          </Link>
        </div>

        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={{ name: driver.name, phone: driver.phone ?? "", isActive: driver.isActive }}
            submitLabel="Save changes"
            action={updateDriverAction.bind(null, params.partnerId, driver.id)}
          />
        </div>

        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-text">Trips</h2>
          <div className="mt-3 space-y-2">
            {driver.trips.length === 0 && (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No trips recorded against this driver yet.
              </p>
            )}
            {driver.trips.map((t) => (
              <Link
                key={t.id}
                href={`/partner/${params.partnerId}/logistics-fleet/${t.id}`}
                className="flex items-center justify-between rounded-md border border-border bg-bg-raised px-4 py-3 text-sm hover:border-accent"
              >
                <div>
                  <div className="font-medium text-text">{t.origin} &rarr; {t.destination}</div>
                  <div className="text-xs text-text-muted">{t.deliveryStage}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
