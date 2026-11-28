import { withRecordLock } from "@/lib/withRecordLock";
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
import { restoreSerializedUnits } from "@/lib/stockLots";
import { getOpenTillSession } from "@/lib/pos/posTill";
import { calculatePosCredit, recordPosBillingReversal } from "@/lib/pos/posBillingReversal";

export type PosReturnLineInput = { lineId: string; qty: number };

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
  refundReference?: string;
  staffId: string;
  staffName: string;
  tillSessionId: string | null;
  posAccountId?: string;
}) {
  if (!["Cash", "UPI", "Card", "Wallet"].includes(params.refundMethod)) throw new Error("Select a valid refund method.");
  if (params.refundMethod !== "Cash" && !params.refundReference?.trim()) throw new Error("Record the completed refund transaction reference.");
  if (params.refundMethod === "Cash" && !params.tillSessionId) {
    throw new Error("A cash refund requires an open till so the payout is included in till reconciliation.");
  }
  return withRecordLock("inventory-partner", params.partnerId, async () => {
  const record = await getBusinessRecord(params.partnerId, "pos", params.saleId);
  if (!record) throw new Error("Sale not found.");
  if (params.refundMethod === "Cash") {
    const locationId = String(record["locationId"] ?? "");
    if (!params.posAccountId || !locationId) throw new Error("The sale outlet and POS account are required for a cash refund.");
    const till = await getOpenTillSession(params.posAccountId, locationId);
    if (!till || till.id !== params.tillSessionId) throw new Error("The cash till is no longer open for this sale outlet.");
  }
  const sale = extractSaleFromRecord(record);
  if (sale.status !== "Completed") throw new Error("Only a Completed sale can be returned.");

  if (await hasExistingReturn(params.partnerId, params.saleId)) {
    throw new Error("This sale has already had a return processed against it.");
  }

  const linesById = new Map(sale.lines.map((l) => [l.id, l]));
  let refundAmount = 0;
  const returnLines: { sku: string; productName: string; qty: number; unitPrice: number; taxRate: number; lineRefund: number; serialNumber?: string; serialLotId?: string }[] = [];

  const seen = new Set<string>();
  for (const input of params.lines) {
    if (!Number.isSafeInteger(input.qty) || input.qty < 0) throw new Error("Invalid return quantity.");
    if (input.qty === 0) continue;
    if (seen.has(input.lineId)) throw new Error("A sale line can only be returned once.");
    seen.add(input.lineId);
    const line = linesById.get(input.lineId);
    if (!line) throw new Error("The selected line is not on this sale.");
    if (input.qty > line.qty) {
      throw new Error(`Cannot return ${input.qty} of ${line.productName} — only ${line.qty} were sold.`);
    }
    if (line.serialNumber && input.qty !== 1) throw new Error("A serialized unit must be returned as exactly one unit.");
    // Per-unit net price after this line's flat discount, tax-inclusive —
    // an approximation (the discount was applied to the whole line, not
    // per unit), same rounding posture computeSaleTotals already uses.
    const unitNet = Math.max(0, line.unitPrice - (line.discount || 0) / line.qty);
    const lineRefund = Math.round(unitNet * input.qty * (1 + (line.taxRate || 0) / 100) * 100) / 100;
    refundAmount += lineRefund;
    returnLines.push({ sku: line.sku, productName: line.productName, qty: input.qty, unitPrice: line.unitPrice, taxRate: line.taxRate, lineRefund, serialNumber: line.serialNumber, serialLotId: line.serialLotId });
  }
  if (returnLines.length === 0) throw new Error("Select at least one line and quantity to return.");
  const selected = params.lines.filter((input) => input.qty > 0).map((input) => ({ line: linesById.get(input.lineId)!, qty: input.qty }));
  const rounded = calculatePosCredit(selected).totalAmount;
  const allocationDifference = Math.round((rounded - refundAmount) * 100) / 100;
  returnLines[returnLines.length - 1].lineRefund = Math.round((returnLines[returnLines.length - 1].lineRefund + allocationDifference) * 100) / 100;
  if (!Number.isFinite(sale.totalAmount) || sale.totalAmount < 0 || rounded > sale.totalAmount + 0.001) {
    throw new Error("Refund exceeds the amount charged for this sale. Review the sale before returning stock.");
  }
  const invoiceId = String(record["invoiceId"] ?? "");
  if (!invoiceId) throw new Error("The linked Billing invoice is missing; review before restocking.");

  // Restock the EXACT stock row the sku identifies (a Stock row IS a
  // specific material+warehouse — same direct-by-id update
  // voidSaleAction already uses, not adjustStockQty's material-code
  // lookup, since the sku here already pins the exact row).
  for (const line of returnLines) {
    const stock = await getBusinessRecord(params.partnerId, "inventory-stock", line.sku);
    if (!stock) throw new Error("Original stock record is missing; review before restocking.");
    if (stock) {
      const restoredQty = Number(stock["qtyOnHand"] ?? 0) + line.qty;
      await updateBusinessRecord(params.partnerId, "inventory-stock", line.sku, { ...stock, qtyOnHand: restoredQty, availableQty: Math.max(0, restoredQty - Number(stock["reservedQty"] ?? 0)) });
    }
  }
  await restoreSerializedUnits(params.partnerId, returnLines.filter((line) => line.serialNumber && line.serialLotId).map((line) => ({ lotId: String(line.serialLotId), serialNumber: String(line.serialNumber) })));

  const ret = await createBusinessRecord(params.partnerId, "pos-returns", {
    saleId: params.saleId,
    lines: returnLines,
    refundAmount: rounded,
    refundMethod: params.refundMethod,
    reason: params.reason || "",
    staffId: params.staffId,
    staffName: params.staffName,
    tillSessionId: params.tillSessionId || "",
    refundReference: params.refundReference?.trim() ?? "",
    returnedAt: new Date().toISOString(),
  });

  const reversed = await recordPosBillingReversal({
    partnerId: params.partnerId, saleId: params.saleId, invoiceId,
    lines: selected,
    refundMethod: params.refundMethod, refundReference: params.refundReference?.trim() ?? "",
    reason: params.reason, returnId: String(ret.id),
  });
  if (reversed.totalAmount !== rounded) throw new Error("Refund and credit note totals differ; review the sale.");

  await updateBusinessRecord(params.partnerId, "pos", params.saleId, {
    ...record,
    hasReturn: true,
    returnedAmount: rounded,
    creditNoteId: reversed.noteId,
  });

  return ret;
  });
}
