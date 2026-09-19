import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DashboardWidget } from "@/components/DashboardWidget";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getAvailabilityDetailByMaterial } from "@/lib/inventoryStock";
import { getWarehouseOptionsForPartner } from "@/lib/sample-data/warehouse";
import { getPnaOverview } from "@/lib/analyticsData";
import { PnaClientTable, type PnaRow } from "./PnaClientTable";

registerPage({
  id: "service-centre.pna.list",
  moduleSlug: "service-centre",
  title: "Parts Not Available — List",
  path: "/partner/[partnerId]/service-centre/pna",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "summary-cards", label: "Open/Available now/Ordered/Fulfilled summary cards" },
  ],
  explanation:
    "Owner/staff work queue for parts marked \"Part Not Available\" on a workorder (WorkorderLifecycle's per-line PNA modal, createPnaEntryAction) — a real BusinessRecord list (moduleSlug service-centre-pna), not just a UI flag on the originating workorder, so sourcing a part is a trackable task with its own status/filters/export. Material Code and Part Name are stored as separate fields (not one combined string) so a part can actually be ordered by name from a supplier. Each row is tagged Inventory Available / Partially Available / Still Unavailable by comparing the real Stock ledger's total (getAvailabilityDetailByMaterial) against the quantity actually needed, not just whether anything at all is on hand. Selected Open rows can raise real Part Orders directly from here (raisePartOrdersFromPnaAction, reuses Inventory's own createPartOrderAction) — no need to re-key the same material/qty into a separate Part Order form. 'Mark Fulfilled' closes out a tracking entry once it's been handled (it never touches Stock itself — that already happened through whichever Inventory document brought the part in). An entry whose workorder gets closed before the part ever came in is auto-moved to a distinct 'Closed (Workorder Closed)' status by patchServiceCentreWorkorderAction, kept separate from a real Fulfilled so the two outcomes are never conflated. A Telegram /pna_report command (computePnaTelegramReport) gives the same open-parts totals on demand, grouped by material with Brand/Model pulled from BOM when the material has one.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/pna/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PnaPage({ params }: { params: { partnerId: string } }) {
  const [records, availability, warehouseOptions, overview] = await Promise.all([
    listBusinessRecords(params.partnerId, "service-centre-pna"),
    getAvailabilityDetailByMaterial(params.partnerId),
    getWarehouseOptionsForPartner(params.partnerId),
    getPnaOverview(params.partnerId),
  ]);

  const rows: PnaRow[] = records
    .map((r) => {
      const materialId = String(r["materialId"] ?? "");
      const materialLabel = String(r["materialLabel"] ?? materialId);
      // materialCode/materialName are real fields on every PNA entry created
      // from here on (see createPnaEntryAction) — fall back to splitting the
      // older combined materialLabel for any entry logged before that split
      // existed, so the list never breaks on pre-existing data.
      const [fallbackCode, ...fallbackRest] = materialLabel.split(" — ");
      const materialCode = String(r["materialCode"] ?? fallbackCode ?? materialId).trim();
      const materialName = String(r["materialName"] ?? fallbackRest.join(" — ")).trim();
      const qty = Number(r["qty"] ?? 0);
      const avail = availability.get(materialCode);
      return {
        id: String(r["id"]),
        workorderId: String(r["workorderId"] ?? ""),
        materialId,
        materialCode,
        materialName,
        qty,
        customerName: String(r["customerName"] ?? ""),
        customerPhone: String(r["customerPhone"] ?? ""),
        brandJobNo: String(r["brandJobNo"] ?? ""),
        status: String(r["status"] ?? "Open"),
        createdDate: String(r["createdDate"] ?? ""),
        availableNow: avail?.text ?? "",
        availableTotal: avail?.total ?? 0,
      };
    })
    // Open items needing action first, most recently logged first within each group.
    .sort((a, b) => (a.status === b.status ? b.createdDate.localeCompare(a.createdDate) : a.status === "Open" ? -1 : 1));

  return (
    <AppShell topbarTitle="Parts Not Available">
      <div>
        <p className="text-sm text-text-muted">
          Parts staff couldn&apos;t fulfil on a workorder, tracked here so they can be sourced and followed up.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DashboardWidget label="Open" value={String(overview.open)} />
          <DashboardWidget label="Available Now" value={String(overview.availableNow)} neon={overview.availableNow > 0} />
          <DashboardWidget label="Ordered" value={String(overview.ordered)} />
          <DashboardWidget label="PNA Fulfilled" value={String(overview.fulfilled)} />
        </div>

        <div className="mt-6">
          <PnaClientTable partnerId={params.partnerId} rows={rows} warehouseOptions={warehouseOptions} />
        </div>
      </div>
    </AppShell>
  );
}
