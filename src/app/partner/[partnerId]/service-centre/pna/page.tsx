import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getAvailabilityByMaterial } from "@/lib/inventoryStock";
import { PnaClientTable, type PnaRow } from "./PnaClientTable";

registerPage({
  id: "service-centre.pna.list",
  moduleSlug: "service-centre",
  title: "Parts Not Available — List",
  path: "/partner/[partnerId]/service-centre/pna",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Owner/staff work queue for parts marked \"Part Not Available\" on a workorder (WorkorderLifecycle's per-line PNA modal, createPnaEntryAction) — a real BusinessRecord list (moduleSlug service-centre-pna), not just a UI flag on the originating workorder, so sourcing a part is a trackable task with its own status. Each row shows a live-computed Available Qty (getAvailabilityByMaterial, the real Stock ledger) so staff can see the moment a part they were waiting on actually arrives, without having to keep re-checking Inventory manually — 'Mark Fulfilled' just closes out the tracking entry once it's been handled (it never touches Stock itself; that already happened through whatever Inventory document — Part Order/Stock Adjustment — brought the part in).",
  sourceFile: "src/app/partner/[partnerId]/service-centre/pna/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PnaPage({ params }: { params: { partnerId: string } }) {
  const [records, availability] = await Promise.all([
    listBusinessRecords(params.partnerId, "service-centre-pna"),
    getAvailabilityByMaterial(params.partnerId),
  ]);

  const rows: PnaRow[] = records
    .map((r) => {
      const materialId = String(r["materialId"] ?? "");
      const code = materialId.split(" — ")[0].trim();
      return {
        id: String(r["id"]),
        workorderId: String(r["workorderId"] ?? ""),
        materialId,
        materialLabel: String(r["materialLabel"] ?? materialId),
        qty: Number(r["qty"] ?? 0),
        customerName: String(r["customerName"] ?? ""),
        customerPhone: String(r["customerPhone"] ?? ""),
        brandJobNo: String(r["brandJobNo"] ?? ""),
        status: String(r["status"] ?? "Open"),
        createdDate: String(r["createdDate"] ?? ""),
        availableNow: availability.get(code) ?? "",
      };
    })
    // Open items needing action first, most recently logged first within each group.
    .sort((a, b) => (a.status === b.status ? b.createdDate.localeCompare(a.createdDate) : a.status === "Fulfilled" ? 1 : -1));

  return (
    <AppShell topbarTitle="Parts Not Available">
      <div>
        <p className="text-sm text-text-muted">
          Parts staff couldn&apos;t fulfil on a workorder, tracked here so they can be sourced and followed up.
        </p>
        <div className="mt-6">
          <PnaClientTable partnerId={params.partnerId} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
