import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getBusinessRecord } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { extractLifecycleFromRecord, mapStageToMilestone, MILESTONE_STATUSES, type MilestoneStatus } from "@/lib/sample-data/service-centre";
import { formatDate } from "@/lib/format";

/**
 * Public, unauthenticated Service Centre workorder tracker — equivalent to
 * AN-CRM's track-workorder public page (a customer looks up their job's
 * status by the workorder id/code they were given at intake, no login).
 * Read-only: shows milestone status, brand/model, assigned technician and
 * a couple of key dates only — no pricing, no internal notes, no customer
 * contact details beyond what the workorder id itself implies.
 *
 * URL shape is /service-centre-track/[partnerId]/[code] rather than a bare
 * /[code] — a workorder id (e.g. "WO-2291") is only unique within a single
 * partner's own BusinessRecord rows (see getBusinessRecord's signature),
 * so the partner must be part of the link. In a follow-up pass this could
 * be shortened via a partner-scoped custom short-link/QR, but this keeps
 * the same record-lookup path every other page in this module already
 * uses, with no new backend surface.
 */

registerPage({
  id: "service-centre.track",
  moduleSlug: "service-centre",
  title: "Track Workorder — Public",
  path: "/service-centre-track/[partnerId]/[code]",
  kind: "document",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Public, no-auth workorder status tracker for customers — equivalent to AN-CRM's track-workorder page. Read-only subset of fields only.",
  sourceFile: "src/app/service-centre-track/[partnerId]/[code]/page.tsx",
});

const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  CREATED: "Received",
  REPAIR_STARTED: "Repair Started",
  REPAIR_IN_PROGRESS: "Repair In Progress",
  PART_PENDING: "Waiting on a Part",
  REPAIR_COMPLETED: "Repair Completed",
  CLOSED: "Ready / Delivered",
  CANCELLED: "Cancelled",
};

export const dynamic = "force-dynamic";

export default async function TrackWorkorderPage({
  params,
}: {
  params: { partnerId: string; code: string };
}) {
  const record = await getBusinessRecord(params.partnerId, "service-centre", params.code);
  if (!record) notFound();
  const partner = await getPartner(params.partnerId);
  const lifecycle = extractLifecycleFromRecord(record);
  const milestone = mapStageToMilestone(lifecycle.stage, lifecycle.onHold);
  const stepperOrder: MilestoneStatus[] = MILESTONE_STATUSES.filter((m) => m !== "CANCELLED");
  const currentIdx = stepperOrder.indexOf(milestone);

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-bg-sunken px-4 py-10">
      <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{partner?.businessName ?? "Service Centre"}</p>
        <h1 className="mt-1 font-display text-xl font-bold text-text">Job {String(record["id"])}</h1>
        <p className="mt-1 text-sm text-text-muted">
          {String(record["device"] ?? ([record["brandName"], record["modelName"]].filter(Boolean).join(" ") || "Device"))}
        </p>

        <div className="mt-6 rounded-md bg-bg-sunken p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Current Status</p>
          <p className="mt-1 font-display text-lg font-bold text-text">{MILESTONE_LABEL[milestone]}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {stepperOrder.map((m, i) => (
            <div key={m} className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${i <= currentIdx ? "bg-accent" : "bg-border"}`}
                aria-hidden
              />
              <span className={i <= currentIdx ? "text-text" : "text-text-muted"}>{MILESTONE_LABEL[m]}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Received</p>
            <p className="mt-0.5 text-text">{record["receivedDate"] ? formatDate(String(record["receivedDate"])) : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Assigned Technician</p>
            <p className="mt-0.5 text-text">{lifecycle.technicianName ?? "Unassigned"}</p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          For questions about this job, please contact the service centre directly.
        </p>
      </div>
    </div>
  );
}
