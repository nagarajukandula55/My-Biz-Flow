import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import {
  getAmcFieldServiceDetailFields,
  getAmcFieldServiceTimeline,
  amcFieldServiceRelated,
  amcFieldServiceColumns,
} from "@/lib/sample-data/amc-field-service";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getAmcContract, extractAmcLifecycle, computeSlaBreach, computeRenewalDue } from "@/lib/amcContractsData";
import { listBusinessRecords } from "@/lib/businessRecords";
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
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const mod = await getModule("amc-field-service");
  const contract = await getAmcContract(params.partnerId, params.recordId);
  if (!contract) notFound();
  const record = {
    id: contract.id,
    customer: contract.customer,
    equipment: contract.equipment,
    contractStartDate: contract.contractStartDate.toISOString().slice(0, 10),
    contractEndDate: contract.contractEndDate.toISOString().slice(0, 10),
    slaHours: contract.slaHours,
    contractValue: contract.contractValue,
    status: contract.serviceVisits[0]?.status ?? "Scheduled",
    contractStatus: contract.contractStatus,
    checkInLatitude: contract.serviceVisits[0]?.checkInLatitude ?? null,
    checkInLongitude: contract.serviceVisits[0]?.checkInLongitude ?? null,
  };
  const fields = await applyCustomizationsToDetailFields("amc-field-service.detail", getAmcFieldServiceDetailFields(record), amcFieldServiceColumns);
  const timeline = getAmcFieldServiceTimeline(record);
  const recordLabel = contract.id;
  const lifecycle = extractAmcLifecycle(contract);
  const slaBreached = computeSlaBreach(lifecycle);
  const renewalDue = computeRenewalDue(lifecycle);
  const serviceVisits = contract.serviceVisits.map((v) => ({
    id: v.id,
    visitDate: (v.serviceRequestRaisedAt ?? v.createdAt).toISOString(),
    technicianName: v.technicianName,
    status: v.status,
  }));

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
          contractStatus={lifecycle.contractStatus as "Active" | "Renewed" | "Expired"}
          serviceRequestRaisedAt={lifecycle.serviceRequestRaisedAt}
          technicianId={lifecycle.technicianId}
          technicianName={lifecycle.technicianName}
          slaHours={lifecycle.slaHours}
          slaBreached={slaBreached}
          renewalDue={renewalDue}
          contractEndDate={lifecycle.contractEndDate}
          technicianOptions={technicianOptions}
          serviceVisits={serviceVisits}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          recordLabel={recordLabel}
          searchParams={searchParams}
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
                {/* No delete affordance — deleting saved business records isn't offered anywhere in the app (see the
                    now-retired DeleteBusinessRecordButton); archive via Contract Status instead. */}
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
