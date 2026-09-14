import { listBusinessRecords } from "@/lib/businessRecords";
import type { ItemOption } from "@/components/LineItemsEditor";

/**
 * The shared line-item "pick from catalog" source for every Billing
 * document that has a repeating line-items table (Sales Invoice, Credit
 * Notes, Quotations, Proforma Invoices, Delivery Challans, Recurring
 * Invoices — all built on LineItemsEditor). Previously each of these
 * built its own itemOptions from the separate "billing-items" catalog —
 * a second, disconnected product/price list next to Inventory's own
 * Material Catalog (BOM), which meant a rate/HSN change on one side never
 * showed up on the other and a partner had to maintain the same catalog
 * twice. Per explicit direction ("don't maintain separate item list here
 * from the BOM"), every document's line-item picker now reads from THIS
 * partner's own live `inventory-bom` BusinessRecord catalog instead — the
 * same Material Catalog Service Centre's workorder Parts & Service Lines
 * already price against (see WorkorderLifecycle.tsx's `setPartLabel` /
 * serviceCentreLines.ts). Only Active materials are offered, same filter
 * getBomOptions() (the sample-data equivalent) already applies.
 *
 * The "billing-items" catalog/module itself is left in place — nothing in
 * this pass deletes it — since removing a whole module/nav entry is a
 * bigger, separate decision than switching what backs a picker. It is
 * effectively redundant now that every document sources from the BOM
 * instead; see CLAUDE.md-adjacent code comments in the affected pages for
 * that follow-up note.
 */
export async function getLineItemCatalogOptions(partnerId: string): Promise<ItemOption[]> {
  const materials = await listBusinessRecords(partnerId, "inventory-bom");
  return materials
    .filter((m) => (m["status"] ?? "Active") === "Active")
    .map((m) => ({
      id: String(m["id"]),
      label: String(m["description"] ?? m["id"]),
      unit: String(m["uom"] ?? "pcs"),
      unitPrice: Number(m["rate"] ?? 0),
      taxRate: Number(m["taxPercent"] ?? 0),
      hsnCode: m["hsnCode"] ? String(m["hsnCode"]) : undefined,
    }));
}
