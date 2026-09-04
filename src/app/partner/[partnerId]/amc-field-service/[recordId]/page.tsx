import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getAmcFieldServiceDetailFields,
  getAmcFieldServiceTimeline,
  amcFieldServiceRelated,
  amcFieldServiceColumns,
  extractAmcLifecycleFromRecord,
  computeSlaBreach,
  computeRenewalDue,
} from "@/lib/sample-data/amc-field-service";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { AmcLifecycle } from "./AmcLifecycle";

registerPage({
  id: "amc-field-service.detail",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — Detail",
  path: "/partner/[partnerId]/amc-field-service/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single contract, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The AmcLifecycle panel above it carries the real domain logic: technician dispatch against this partner's own live Users list, a server-computed SLA-breach badge (open service request older than the contract's response-time SLA with no technician dispatched), a server-computed renewal-due badge (contract end date within 30 days), and a Renew Contract action that creates the next-term contract and marks this one Renewed.",
  sourceFile: "src/app/partner/[partnerId]/amc-field-service/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AmcFieldServiceDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("amc-field-service");
  const record = await getBusinessRecord(params.partnerId, "amc-field-service", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("amc-field-service.detail", getAmcFieldServiceDetailFields(record), amcFieldServiceColumns);
  const timeline = getAmcFieldServiceTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractAmcLifecycleFromRecord(record);
  const slaBreached = computeSlaBreach(lifecycle);
  const renewalDue = computeRenewalDue(lifecycle);

  const userRecords = await listBusinessRecords(params.partnerId, "users");
  const technicianOptions = userRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["id"]) }));

  return (
    <AppShell topbarTitle={mod?.label ?? "AMC / Field Service"}>
      <div>
        <AmcLifecycle
          partnerId={params.partnerId}
          contractId={recordLabel}
          contractStatus={lifecycle.contractStatus}
          serviceRequestRaisedAt={lifecycle.serviceRequestRaisedAt}
          technicianId={lifecycle.technicianId}
          technicianName={lifecycle.technicianName}
          slaHours={lifecycle.slaHours}
          slaBreached={slaBreached}
          renewalDue={renewalDue}
          contractEndDate={lifecycle.contractEndDate}
          technicianOptions={technicianOptions}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={amcFieldServiceRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Contract detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/amc-field-service`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/amc-field-service/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/amc-field-service/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="amc-field-service" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
