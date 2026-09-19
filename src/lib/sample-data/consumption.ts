import type { Column, Row } from "@/components/DataTable";

/**
 * Real per-workorder Parts Consumption history — one row per part line
 * actually deducted from Stock by deductInventoryForWorkorderAction (see
 * src/app/partner/[partnerId]/service-centre/[recordId]/actions.ts), not
 * sample/demo data. Read-only, no create form — the only way a row here
 * ever gets created is a real workorder closing and consuming real stock.
 * Lets a partner see usage trends (which parts actually get used, how
 * fast) instead of only ever seeing the current on-hand snapshot, so they
 * can reorder ahead of running out rather than discovering a shortage
 * mid-repair.
 */
export const consumptionColumns: Column[] = [
  { key: "id", label: "Consumption ID", type: "text" },
  { key: "workorderId", label: "Workorder", type: "relation-link" },
  { key: "materialId", label: "Material Code", type: "text" },
  { key: "materialLabel", label: "Part", type: "text" },
  { key: "qty", label: "Qty Consumed", type: "text" },
  { key: "warehouseName", label: "Warehouse", type: "text" },
  { key: "serial", label: "Serial / Barcode", type: "text" },
  { key: "customerName", label: "Customer", type: "text" },
  { key: "consumedDate", label: "Consumed Date", type: "date" },
];

/** Sums qty by material code over the given rows — the basis for the "Top consumed parts" ranking shown on the Parts Consumption page. */
export function summarizeConsumptionByMaterial(rows: Row[]): { materialId: string; materialLabel: string; totalQty: number }[] {
  const byMaterial = new Map<string, { materialLabel: string; totalQty: number }>();
  for (const r of rows) {
    const materialId = String(r["materialId"] ?? "").trim();
    if (!materialId) continue;
    const existing = byMaterial.get(materialId) ?? { materialLabel: String(r["materialLabel"] ?? materialId), totalQty: 0 };
    existing.totalQty += Number(r["qty"] ?? 0);
    byMaterial.set(materialId, existing);
  }
  return Array.from(byMaterial.entries())
    .map(([materialId, v]) => ({ materialId, ...v }))
    .sort((a, b) => b.totalQty - a.totalQty);
}
