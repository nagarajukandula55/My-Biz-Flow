/**
 * Partial returns/refunds against a Completed POS sale — restocks the
 * exact Good units returned and records a refund. Kept as its own
 * "pos-returns" BusinessRecord (not a new Prisma model, like PosTillSession
 * needed) — a return is a simple linked document, the same generic JSON
 * shape every other module's audit-trail records (Stock Adjustments,
 * Return Orders) already use.
 *
 * Deliberately ONE return per sale for this pass — a sale can be returned
 * once (fully or partially), not returned again later for the remaining
 * lines. A natural follow-up once partial-then-partial-again reconciliation
 * is actually needed; for now this keeps "how much of this sale is still
 * returnable" a single yes/no check instead of a running per-line ledger.
 */
import { getBusinessRecord, createBusinessRecord, updateBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { extractSaleFromRecord } from "@/lib/sample-data/pos";

export type PosReturnLineInput = { sku: string; qty: number };

export async function hasExistingReturn(partnerId: string, saleId: string): Promise<boolean> {
  const returns = await listBusinessRecords(partnerId, "pos-returns");
  return returns.some((r) => r["saleId"] === saleId);
}

export async function createPosReturn(params: {
  partnerId: string;
  saleId: string;
  lines: PosReturnLineInput[];
  refundMethod: "Cash" | "UPI" | "Card" | "Wallet";
  reason: string;
  staffId: string;
  staffName: string;
  tillSessionId: string | null;
}) {
  const record = await getBusinessRecord(params.partnerId, "pos", params.saleId);
  if (!record) throw new Error("Sale not found.");
  const sale = extractSaleFromRecord(record);
  if (sale.status !== "Completed") throw new Error("Only a Completed sale can be returned.");

  if (await hasExistingReturn(params.partnerId, params.saleId)) {
    throw new Error("This sale has already had a return processed against it.");
  }

  const linesBySku = new Map(sale.lines.map((l) => [l.sku, l]));
  let refundAmount = 0;
  const returnLines: { sku: string; productName: string; qty: number; unitPrice: number; taxRate: number; lineRefund: number }[] = [];

  for (const input of params.lines) {
    if (!input.qty || input.qty <= 0) continue;
    const line = linesBySku.get(input.sku);
    if (!line) throw new Error(`Line "${input.sku}" isn't on this sale.`);
    if (input.qty > line.qty) {
      throw new Error(`Cannot return ${input.qty} of ${line.productName} — only ${line.qty} were sold.`);
    }
    // Per-unit net price after this line's flat discount, tax-inclusive —
    // an approximation (the discount was applied to the whole line, not
    // per unit), same rounding posture computeSaleTotals already uses.
    const unitNet = Math.max(0, line.unitPrice - (line.discount || 0) / line.qty);
    const lineRefund = Math.round(unitNet * input.qty * (1 + (line.taxRate || 0) / 100) * 100) / 100;
    refundAmount += lineRefund;
    returnLines.push({ sku: input.sku, productName: line.productName, qty: input.qty, unitPrice: line.unitPrice, taxRate: line.taxRate, lineRefund });
  }
  if (returnLines.length === 0) throw new Error("Select at least one line and quantity to return.");

  // Restock the EXACT stock row the sku identifies (a Stock row IS a
  // specific material+warehouse — same direct-by-id update
  // voidSaleAction already uses, not adjustStockQty's material-code
  // lookup, since the sku here already pins the exact row).
  for (const line of returnLines) {
    const stock = await getBusinessRecord(params.partnerId, "inventory-stock", line.sku);
    if (stock) {
      const restoredQty = Number(stock["qtyOnHand"] ?? 0) + line.qty;
      await updateBusinessRecord(params.partnerId, "inventory-stock", line.sku, { ...stock, qtyOnHand: restoredQty });
    }
  }

  const rounded = Math.round(refundAmount * 100) / 100;
  const ret = await createBusinessRecord(params.partnerId, "pos-returns", {
    saleId: params.saleId,
    lines: returnLines,
    refundAmount: rounded,
    refundMethod: params.refundMethod,
    reason: params.reason || "",
    staffId: params.staffId,
    staffName: params.staffName,
    tillSessionId: params.tillSessionId || "",
    returnedAt: new Date().toISOString(),
  });

  await updateBusinessRecord(params.partnerId, "pos", params.saleId, {
    ...record,
    hasReturn: true,
    returnedAmount: rounded,
  });

  return ret;
}
