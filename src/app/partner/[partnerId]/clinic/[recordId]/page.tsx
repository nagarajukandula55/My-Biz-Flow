import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getClinicDetailFields, getClinicTimeline, clinicColumns } from "@/lib/sample-data/clinic";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { ClinicLifecycle } from "./ClinicLifecycle";

registerPage({
  id: "clinic.detail",
  moduleSlug: "clinic",
  title: "Clinic — Detail",
  path: "/partner/[partnerId]/clinic/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
    { key: "completion-panel", label: "Consultation completion & billing panel" },
  ],
  explanation: "Read-only detail view of a single appointment, rendered via the shared RecordDetail component (field grid + activity timeline + a related-records rail of this patient's past visits), with Edit and Delete actions in the header. The ClinicLifecycle panel above it captures prescription/treatment notes when staff mark the appointment Completed, and creates a real Billing invoice for the consultation fee from there.",
  sourceFile: "src/app/partner/[partnerId]/clinic/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ClinicDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("clinic");
  const record = await getBusinessRecord(params.partnerId, "clinic", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("clinic.detail", getClinicDetailFields(record), clinicColumns);
  const timeline = getClinicTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);

  // Patient history — every other clinic appointment for the same patient,
  // tenant-scoped to this partner, most recent first.
  const allRecords = await listBusinessRecords(params.partnerId, "clinic");
  const patientHistory = allRecords
    .filter((r) => r["id"] !== record["id"] && r["patientName"] && r["patientName"] === record["patientName"])
    .sort((a, b) => String(b["appointmentDateTime"] ?? "").localeCompare(String(a["appointmentDateTime"] ?? "")))
    .map((r) => ({
      id: String(r["id"]),
      title: `${String(r["appointmentDateTime"] ?? "").slice(0, 10)} — ${r["status"] ?? "—"}`,
      subtitle: String(r["diagnosis"] ?? r["doctor"] ?? ""),
    }));

  return (
    <AppShell topbarTitle={mod?.label ?? "Clinic"}>
      <div>
        <ClinicLifecycle
          partnerId={params.partnerId}
          recordId={recordLabel}
          initialStatus={String(record["status"] ?? "Scheduled")}
          initialPrescriptionNotes={record["prescriptionNotes"] ? String(record["prescriptionNotes"]) : undefined}
          invoiceId={record["invoiceId"] ? String(record["invoiceId"]) : undefined}
        />

        <div className="mt-6">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={patientHistory}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Appointment detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/clinic`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/clinic/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="clinic" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
