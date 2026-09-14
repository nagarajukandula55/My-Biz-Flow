import { extractLifecycleFromRecord } from "@/lib/sample-data/service-centre";
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
  rate: number;
  gstRate: number;
  discount?: number;
};

/** Default GST slab for a labour/service line — SAC 9987 (repair & maintenance). */
const SERVICE_HSN = "9987";
const DEFAULT_GST_RATE = 18;

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
  const underWarranty = Boolean(record["warrantyFlag"]);
  const lifecycle = extractLifecycleFromRecord(record);
  const items: ServiceCentreLine[] = [];

  for (const line of lifecycle.serviceLines) {
    items.push({
      description: line.solutionLabel,
      hsn: SERVICE_HSN,
      quantity: 1,
      rate: underWarranty ? 0 : line.laborCharge,
      gstRate: DEFAULT_GST_RATE,
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
    items.push({
      description: line.materialLabel,
      hsn: String(material?.["hsnCode"] ?? ""),
      quantity: line.qty,
      // Prefer the price stamped onto the line when it was added — that's
      // the figure the customer approved, so the printed document can't
      // drift from the persisted invoice if the catalog price changes
      // afterwards. Falls back to the live catalog for older lines.
      rate: underWarranty ? 0 : Number(line.unitPrice ?? material?.["rate"] ?? 0),
      gstRate: Number(line.taxRate ?? material?.["taxPercent"] ?? DEFAULT_GST_RATE),
    });
  }
  return items;
}
