import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listBusinessRecords } from "@/lib/businessRecords";
import { requirePosStaff } from "@/lib/pos/posAuth";
import { getOpenTillSession } from "@/lib/pos/posTill";
import { prisma } from "@/lib/prisma";
import { TillPanel } from "./TillPanel";

registerPage({
  id: "pos.till",
  moduleSlug: "pos",
  title: "POS — Till",
  path: "/partner/[partnerId]/pos/till",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Cash-drawer session management for one outlet at a time — open with a counted starting float, close with a physical cash count reconciled against what the system expects (opening float + every Cash tender rung up during the session, see computeExpectedCash in src/lib/pos/posTill.ts). Checkout refuses to ring up a sale at an outlet with no Open session. Recent session history below shows the variance (counted - expected) for accountability.",
  sourceFile: "src/app/partner/[partnerId]/pos/till/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PosTillPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { locationId?: string };
}) {
  const staff = await requirePosStaff(params.partnerId);
  const locationRecords = await listBusinessRecords(params.partnerId, "brand");
  const outlets = locationRecords.filter((r) => (r["status"] ?? "Active") === "Active" && r["mappedWarehouse"]);
  const selectedLocation = outlets.find((r) => String(r["id"]) === searchParams?.locationId) ?? outlets[0];

  if (!selectedLocation) {
    return (
      <AppShell topbarTitle="POS — Till">
        <p className="mt-6 rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
          No outlet is set up yet — create a Location under Brand and map it to a Warehouse before opening a till.
        </p>
      </AppShell>
    );
  }

  const locationId = String(selectedLocation["id"]);
  const [openSessionRow, recentSessions] = await Promise.all([
    getOpenTillSession(staff.posAccountId, locationId),
    prisma.posTillSession.findMany({
      where: { posAccountId: staff.posAccountId, locationId },
      orderBy: { openedAt: "desc" },
      take: 10,
      include: { openedByStaff: true, closedByStaff: true },
    }),
  ]);

  const openSession = openSessionRow
    ? { id: openSessionRow.id, openingFloat: openSessionRow.openingFloat, openedAt: openSessionRow.openedAt.toISOString(), openedByName: openSessionRow.openedByStaff?.name ?? "" }
    : null;

  return (
    <AppShell topbarTitle="POS — Till">
      <div>
        <p className="text-sm text-text-muted">Open/close the cash drawer for one outlet at a time.</p>

        <form method="get" className="mt-4 flex items-end gap-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-text-muted">
            Outlet
            <select
              name="locationId"
              defaultValue={locationId}
              className="mt-1 block w-64 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            >
              {outlets.map((o) => (
                <option key={String(o["id"])} value={String(o["id"])}>
                  {String(o["locationName"])} ({String(o["mappedWarehouse"])})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-outline">
            Switch Outlet
          </button>
        </form>

        <div className="mt-6 max-w-md">
          <TillPanel partnerId={params.partnerId} locationId={locationId} openSession={openSession} />
        </div>

        {recentSessions.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 text-sm font-semibold text-text">Recent Sessions — {String(selectedLocation["locationName"])}</div>
            <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-bg-sunken text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                    <th className="px-3 py-2.5">Opened</th>
                    <th className="px-3 py-2.5">Opened By</th>
                    <th className="px-3 py-2.5 text-right">Float</th>
                    <th className="px-3 py-2.5 text-right">Expected</th>
                    <th className="px-3 py-2.5 text-right">Counted</th>
                    <th className="px-3 py-2.5 text-right">Variance</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSessions.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2">{s.openedAt.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">{s.openedByStaff?.name ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">₹{s.openingFloat.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.expectedCash != null ? `₹${s.expectedCash.toLocaleString("en-IN")}` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{s.countedCash != null ? `₹${s.countedCash.toLocaleString("en-IN")}` : "—"}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${s.variance && s.variance !== 0 ? "font-semibold text-danger" : "text-text"}`}>
                        {s.variance != null ? `₹${s.variance.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-3 py-2">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
