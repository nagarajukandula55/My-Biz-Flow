import { extractLifecycleFromRecord, isUnderWarranty } from "@/lib/sample-data/service-centre";
import { getBusinessRecordsByKeys } from "@/lib/businessRecords";

/**
 * A priced line derived from a workorder's Parts & Service Lines. Shared by
 * the Sales Invoice document and the Estimate document so the figure the
 * customer approves up front and the figure they are billed at handover are
 * computed by exactly one piece of code and cannot drift apart.
 */
export type ServiceCentreLine = {
  description: string;
  hsn: string;
  quantity: number;
  /** Unit of measure printed in the invoice/estimate item table's "Unit"
   * column — the BOM material's own `uom` for a part line, and the fixed
   * "Service" for a labour line (a solution isn't measured in pieces).
   * Previously the priced documents hardcoded "PCS" for every line, which
   * printed "1 PCS" against labour. */
  unit: string;
  rate: number;
  gstRate: number;
  discount?: number;
};

/** Default GST slab for a labour/service line — SAC 9987 (repair & maintenance). */
const SERVICE_HSN = "9987";
const DEFAULT_GST_RATE = 18;

/**
 * Reverse-calc for a tax-inclusive entered price — same formula as
 * WorkorderLifecycle.tsx's own baseRateOf(): when rateMode is "incl", the
 * number typed into Rate/Labour Charge already has taxRate% baked in, so
 * the base (tax-exclusive) rate that must feed Subtotal/CGST/SGST is
 * `entered / (1 + tax/100)` — otherwise tax gets charged a second time on
 * top of an already-taxed number. Previously this file used `unitPrice`/
 * `laborCharge` as-is regardless of rateMode, so a workorder priced with
 * "Incl GST" lines (the estimate/total preview on the workorder page
 * itself DOES apply this conversion) got double-taxed the moment it was
 * actually invoiced — the persisted Billing record and printed Sales
 * Invoice disagreed with what the workorder page showed the customer.
 */
function baseRateOf(entered: number, taxPercent: number, rateMode?: "excl" | "incl"): number {
  return rateMode === "incl" ? entered / (1 + taxPercent / 100) : entered;
}

/**
 * Derives priced line items from a workorder, looking parts up in THIS
 * partner's own live BOM (not the global sample catalog).
 *
 * Warranty jobs are non-chargeable: every line's rate is zeroed rather than
 * silently charging a warranty repair — the same rule
 * createInvoiceFromWorkorderAction applies when persisting the real Billing
 * invoice, and the same rule the reference app enforces server-side on its
 * close/handover/generate-estimate routes.
 *
 * Part lines marked `pending` are excluded: a part that hasn't arrived was
 * not fitted, so billing or quoting for it would be wrong.
 */
export async function buildServiceCentreLines(
  partnerId: string,
  record: Record<string, unknown> | null
): Promise<ServiceCentreLine[]> {
  if (!record) return [];
  const underWarranty = isUnderWarranty(record);
  const lifecycle = extractLifecycleFromRecord(record);
  const items: ServiceCentreLine[] = [];

  for (const line of lifecycle.serviceLines) {
    const gstRate = DEFAULT_GST_RATE;
    items.push({
      description: line.solutionLabel,
      hsn: SERVICE_HSN,
      quantity: 1,
      unit: "Service",
      rate: underWarranty ? 0 : baseRateOf(line.laborCharge, gstRate, line.rateMode),
      gstRate,
    });
  }

  const billableParts = lifecycle.partLines.filter((line) => !line.pending);
  // Batch-fetch every referenced BOM material in one query instead of one
  // getBusinessRecord() round-trip per part line.
  const materialsById = await getBusinessRecordsByKeys(
    partnerId,
    "inventory-bom",
    billableParts.map((line) => line.materialId)
  );
  for (const line of billableParts) {
    const material = materialsById.get(line.materialId);
    const gstRate = Number(line.taxRate ?? material?.["taxPercent"] ?? DEFAULT_GST_RATE);
    const enteredRate = Number(line.unitPrice ?? material?.["rate"] ?? 0);
    items.push({
      description: line.materialLabel,
      hsn: String(material?.["hsnCode"] ?? ""),
      unit: String(material?.["uom"] ?? "PCS"),
      quantity: line.qty,
      // Prefer the price stamped onto the line when it was added — that's
      // the figure the customer approved, so the printed document can't
      // drift from the persisted invoice if the catalog price changes
      // afterwards. Falls back to the live catalog for older lines.
      // baseRateOf() backs tax out of an "Incl GST"-entered rate first,
      // same as WorkorderLifecycle.tsx's own live total preview.
      rate: underWarranty ? 0 : baseRateOf(enteredRate, gstRate, line.rateMode),
      gstRate,
    });
  }
  return items;
}
