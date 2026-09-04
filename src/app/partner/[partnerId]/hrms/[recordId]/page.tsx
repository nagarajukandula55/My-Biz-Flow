import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { DeleteBusinessRecordButton } from "@/components/DeleteBusinessRecordButton";
import { getHrmsDetailFields, getHrmsTimeline, hrmsRelated, hrmsColumns, extractHrmsLifecycleFromRecord } from "@/lib/sample-data/hrms";
import { applyCustomizationsToDetailFields } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { HrmsLifecycle } from "./HrmsLifecycle";

registerPage({
  id: "hrms.detail",
  moduleSlug: "hrms",
  title: "HRMS / Payroll — Detail",
  path: "/partner/[partnerId]/hrms/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
    { key: "related-records", label: "Related records rail" },
  ],
  explanation: "Read-only detail view of a single employee, rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The HrmsLifecycle panel above it carries the real domain logic: attendance marking with a computed current-month attendance %, a leave-balance-backed request/approve/reject flow, and a Run Payroll action that deducts for unapproved-absence days.",
  sourceFile: "src/app/partner/[partnerId]/hrms/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function HrmsDetailPage({
  params,
}: {
  params: { partnerId: string; recordId: string };
}) {
  const mod = await getModule("hrms");
  const record = await getBusinessRecord(params.partnerId, "hrms", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizationsToDetailFields("hrms.detail", getHrmsDetailFields(record), hrmsColumns);
  const timeline = getHrmsTimeline(record);
  const recordLabel = String(record["id"] ?? params.recordId);
  const lifecycle = extractHrmsLifecycleFromRecord(record);

  return (
    <AppShell topbarTitle={mod?.label ?? "HRMS / Payroll"}>
      <div>
        <HrmsLifecycle
          partnerId={params.partnerId}
          employeeId={recordLabel}
          baseSalary={lifecycle.baseSalary}
          initialLeaveBalance={lifecycle.leaveBalance}
          initialAttendance={lifecycle.attendance}
          initialLeaveRequests={lifecycle.leaveRequests}
          initialPayslips={lifecycle.payslips}
        />

        <div className="mt-8">
        <RecordDetail
          fields={fields}
          timeline={timeline}
          related={hrmsRelated}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                <p className="mt-1 text-xs text-text-muted">Employee detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/hrms`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link
                  href={`/partner/${params.partnerId}/hrms/${params.recordId}/edit`}
                  className="btn-outline"
                >
                  Edit
                </Link>
                <DeleteBusinessRecordButton partnerId={params.partnerId} moduleSlug="hrms" recordKey={params.recordId} recordLabel={recordLabel} />
              </div>
            </div>
          }
        />
        </div>
      </div>
    </AppShell>
  );
}
