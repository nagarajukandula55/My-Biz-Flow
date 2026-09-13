import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import {
  getServiceCentreDetailFields,
  getServiceCentreTimeline,
  serviceCentreRelated,
  serviceCentreColumns,
  extractLifecycleFromRecord,
} from "@/lib/sample-data/service-centre";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { listActivePartnerStaff } from "@/lib/partnerStaff";
import { WorkorderLifecycle } from "./WorkorderLifecycle";

registerPage({
  id: "service-centre.detail",
  moduleSlug: "service-centre",
  title: "Service Centre — Detail",
  path: "/partner/[partnerId]/service-centre/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single workorder, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The WorkorderLifecycle panel above it carries the real domain logic: Brand/Model/Technician assignment against this partner's own live catalogs, an estimate-approval gate before repair work starts (skipped for in-warranty jobs, which are also non-chargeable throughout), a Hold (Parts Pending) side-state distinct from Cancelled, and real Billing-invoice creation on Close.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ServiceCentreDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("service-centre");
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("service-centre.detail", getServiceCentreDetailFields(record), serviceCentreColumns);
  const timeline = getServiceCentreTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractLifecycleFromRecord(record);
  const bomRecords = await listBusinessRecords(params.partnerId, "inventory-bom");
  const bomMaterials = bomRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({
      id: String(r["id"]),
      label: `${r["id"]} — ${r["description"] ?? ""}`,
      serialized: Boolean(r["serialized"]),
    }));
  const solutionRecords = await listBusinessRecords(params.partnerId, "service-centre-solutions");
  const solutionOptions = solutionRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["title"] ?? r["id"]) }));

  const brandRecords = await listBusinessRecords(params.partnerId, "service-centre-brands");
  const brandOptions = brandRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: String(r["name"] ?? r["id"]) }));

  const modelRecords = await listBusinessRecords(params.partnerId, "service-centre-models");
  const modelOptions = modelRecords
    .filter((r) => r["status"] === "Active")
    .map((r) => ({ value: String(r["id"]), label: `${r["name"] ?? r["id"]} (${r["brandName"] ?? "—"})` }));

  // Sourced from real PartnerStaff accounts (technicians/managers can be
  // assigned) instead of the label-only "users" BusinessRecord sample data
  // — see src/lib/sample-data/users.ts's header comment. "users" is still
  // used elsewhere unchanged (e.g. other modules' team-member display) —
  // only Service Centre's technician assignment has been switched over.
  const staffRecords = await listActivePartnerStaff(params.partnerId);
  const technicianOptions = staffRecords
    .filter((s) => s.role === "Technician" || s.role === "Manager" || s.role === "Owner")
    .map((s) => ({ value: s.id, label: `${s.name} (${s.role})` }));

  return (
    <AppShell topbarTitle={mod?.label ?? "Service Centre"}>
      <div>
        <WorkorderLifecycle
          partnerId={params.partnerId}
          workorderId={recordLabel}
          initialStage={lifecycle.stage}
          initialPartLines={lifecycle.partLines}
          initialServiceLines={lifecycle.serviceLines}
          initialHandoverNotes={lifecycle.handoverNotes}
          brandId={lifecycle.brandId}
          brandName={lifecycle.brandName}
          modelId={lifecycle.modelId}
          modelName={lifecycle.modelName}
          technicianId={lifecycle.technicianId}
          technicianName={lifecycle.technicianName}
          onHold={lifecycle.onHold}
          holdReason={lifecycle.holdReason}
          estimateApproved={lifecycle.estimateApproved}
          underWarranty={Boolean(record["warrantyFlag"])}
          invoiceId={lifecycle.invoiceId}
          bomMaterials={bomMaterials}
          solutionOptions={solutionOptions}
          brandOptions={brandOptions}
          modelOptions={modelOptions}
          technicianOptions={technicianOptions}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={serviceCentreRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Workorder detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/service-centre`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/${params.recordId}/document`}
                  className="btn-outline"
                >
                  View document
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/service-centre/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton
                  partnerId={params.partnerId}
                  moduleSlug="service-centre"
                  recordKey={params.recordId}
                  recordLabel={recordLabel}
                />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
