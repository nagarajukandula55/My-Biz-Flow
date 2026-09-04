"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { computeSaleTotals, extractSaleFromRecord, type SaleLine, type Tender } from "@/lib/sample-data/pos";

export type CompleteSaleInput = {
  lines: SaleLine[];
  tenders: Tender[];
  cashier?: string;
  branch?: string;
};

/**
 * Completes a sale: recomputes totals server-side (never trusts client
 * math), checks + deducts Inventory stock for every line, persists the
 * sale, and creates a real Billing invoice — mirrors
 * createInvoiceFromWorkorderAction in
 * service-centre/[recordId]/actions.ts. Read-then-write against
 * BusinessRecord's JSON blob (not a DB-level atomic decrement) — same
 * documented limitation as that module until per-SKU stock becomes a
 * real relational column.
 */
export async function completeSaleAction(partnerId: string, input: CompleteSaleInput) {
  if (input.lines.length === 0) throw new Error("Cart is empty");

  const totals = computeSaleTotals(input.lines);
  const amountTendered = input.tenders.reduce((sum, t) => sum + t.amount, 0);
  if (amountTendered < totals.totalAmount) {
    throw new Error(`Amount tendered (₹${amountTendered}) is less than the total due (₹${totals.totalAmount})`);
  }
  const changeDue = Math.round((amountTendered - totals.totalAmount) * 100) / 100;

  // Stock check — fail closed, no partial deduction.
  const stockRecords = await listBusinessRecords(partnerId, "inventory-stock");
  const stockBySku = new Map(stockRecords.map((r) => [String(r["id"]), r]));
  for (const line of input.lines) {
    const stock = stockBySku.get(line.sku);
    const available = Number(stock?.["quantityOnHand"] ?? 0);
    if (!stock || available < line.qty) {
      throw new Error(
        `Insufficient stock for ${line.productName} (${line.sku}): ${available} available, ${line.qty} requested.`
      );
    }
  }
  for (const line of input.lines) {
    const stock = stockBySku.get(line.sku)!;
    const newQty = Number(stock["quantityOnHand"] ?? 0) - line.qty;
    await updateBusinessRecord(partnerId, "inventory-stock", line.sku, { ...stock, quantityOnHand: newQty });
  }

  const paymentSummary = Array.from(new Set(input.tenders.map((t) => t.method))).join(" + ");

  const sale = await createBusinessRecord(partnerId, "pos", {
    status: "Completed",
    lines: input.lines,
    lineCount: input.lines.length,
    ...totals,
    tenders: input.tenders,
    amountTendered,
    changeDue,
    cashier: input.cashier || "",
    branch: input.branch || "",
    stockDeducted: true,
    paymentSummary,
    transactionTimestamp: new Date().toISOString(),
  });

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: "Walk-in Customer",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: input.lines.map((l) => `${l.productName} x${l.qty}`).join(", "),
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    paymentStatus: "Paid",
    paymentMode: input.tenders[0]?.method,
    sourcePosSaleId: sale.id,
  });

  await updateBusinessRecord(partnerId, "pos", String(sale.id), { ...sale, invoiceId: invoice.id });

  revalidatePath(`/partner/${partnerId}/pos`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/pos/${sale.id}`);
}

/**
 * Voids a Completed sale — restores deducted stock and marks the sale
 * Voided. Does not touch the linked Billing invoice (a real credit-note/
 * refund flow is Billing's own scope) — leaves a clear void marker so
 * reports read correctly.
 */
export async function voidSaleAction(partnerId: string, saleId: string, reason: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "pos", saleId);
  if (!record) return;
  const sale = extractSaleFromRecord(record);
  if (sale.status !== "Completed") return;

  if (sale.stockDeducted) {
    for (const line of sale.lines) {
      const stock = await getBusinessRecord(partnerId, "inventory-stock", line.sku);
      if (stock) {
        const restoredQty = Number(stock["quantityOnHand"] ?? 0) + line.qty;
        await updateBusinessRecord(partnerId, "inventory-stock", line.sku, { ...stock, quantityOnHand: restoredQty });
      }
    }
  }

  await updateBusinessRecord(partnerId, "pos", saleId, {
    ...record,
    status: "Voided",
    voidedAt: new Date().toISOString(),
    voidReason: reason || "Voided by cashier",
  });

  revalidatePath(`/partner/${partnerId}/pos`);
  revalidatePath(`/partner/${partnerId}/pos/${saleId}`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}
