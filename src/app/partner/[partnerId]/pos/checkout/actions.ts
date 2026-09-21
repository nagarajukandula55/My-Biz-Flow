"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { computeSaleTotals, extractSaleFromRecord, type SaleLine, type Tender } from "@/lib/sample-data/pos";
import type { LineItem } from "@/lib/sample-data/billing";
import { requirePosStaffAction } from "@/lib/pos/posAuth";
import { getOpenTillSession } from "@/lib/pos/posTill";

export type CompleteSaleInput = {
  lines: SaleLine[];
  tenders: Tender[];
  branch?: string;
  locationId?: string;
  tillSessionId: string;
};

/**
 * Completes a sale: recomputes totals server-side (never trusts client
 * math), checks + deducts Inventory stock for every line, persists the
 * sale, and creates a real Billing invoice. POS is its own standalone
 * module — not connected to Service Centre or any other vertical, only to
 * the cross-cutting Inventory and Billing infrastructure every module
 * shares (see src/lib/inventoryStock.ts). Read-then-write against
 * BusinessRecord's JSON blob (not a DB-level atomic decrement) — a
 * documented limitation until per-SKU stock becomes a real relational
 * column. Gated by requirePosStaffAction (POS's own staff session), not
 * requireSessionPartnerId — a POS staff member has no main partner
 * session at all (see PartnerLayout's STAFF_ONLY_MODULE_PREFIXES). The
 * cashier name is taken from the verified session, never trusted from the
 * client, same posture as the totals recompute below.
 */
export async function completeSaleAction(partnerId: string, input: CompleteSaleInput) {
  const staff = await requirePosStaffAction(partnerId);
  if (input.lines.length === 0) throw new Error("Cart is empty");

  // Re-verify the till session server-side rather than trusting the
  // client-supplied id — a sale can only ring up against the outlet's
  // REAL currently-Open session, never a stale/closed/forged one, since
  // the till's cash reconciliation (computeExpectedCash) sums Cash tenders
  // by this exact id.
  if (!input.locationId) throw new Error("No outlet selected.");
  const openSession = await getOpenTillSession(staff.posAccountId, input.locationId);
  if (!openSession || openSession.id !== input.tillSessionId) {
    throw new Error("This till session is no longer open — refresh and open a till before selling.");
  }

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
    const available = Number(stock?.["qtyOnHand"] ?? 0);
    if (!stock || available < line.qty) {
      throw new Error(
        `Insufficient stock for ${line.productName} (${line.sku}): ${available} available, ${line.qty} requested.`
      );
    }
  }
  for (const line of input.lines) {
    const stock = stockBySku.get(line.sku)!;
    const newQty = Number(stock["qtyOnHand"] ?? 0) - line.qty;
    await updateBusinessRecord(partnerId, "inventory-stock", line.sku, { ...stock, qtyOnHand: newQty });
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
    cashier: `${staff.name} (${staff.staffCode})`,
    posStaffId: staff.id,
    branch: input.branch || "",
    locationId: input.locationId || "",
    posTillSessionId: openSession.id,
    stockDeducted: true,
    paymentSummary,
    transactionTimestamp: new Date().toISOString(),
  });

  // Real itemized lines (not just the flat lineItemsSummary string) so the
  // printed/viewed Billing document (BillingInvoiceDocument.tsx) shows a
  // proper per-line GST breakdown for a POS sale exactly like any other
  // invoice — it reads record["items"], which nothing here populated
  // before. No customerState is ever captured for a walk-in sale, so that
  // component's own interState check (customerState vs partnerState)
  // naturally falls back to intra-state CGST+SGST, the correct default
  // for a retail counter sale.
  const items: LineItem[] = input.lines.map((l) => ({
    description: l.productName,
    quantity: l.qty,
    unit: "pcs",
    unitPrice: Math.max(0, (l.qty * l.unitPrice - (l.discount || 0)) / l.qty),
    taxRate: l.taxRate || 0,
  }));

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: "Walk-in Customer",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: input.lines.map((l) => `${l.productName} x${l.qty}`).join(", "),
    items,
    subtotal: totals.subtotal,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
    paymentStatus: "Paid",
    paymentMode: input.tenders[0]?.method,
    sourcePosSaleId: sale.id,
    invoiceSource: "POS Sale",
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
 * reports read correctly. Open to any logged-in POS staff for now (not
 * Manager-gated) — a natural follow-up once a real permission matrix is
 * wanted, same posture requirePosManager already exists for elsewhere.
 */
export async function voidSaleAction(partnerId: string, saleId: string, reason: string): Promise<void> {
  await requirePosStaffAction(partnerId);
  const record = await getBusinessRecord(partnerId, "pos", saleId);
  if (!record) return;
  const sale = extractSaleFromRecord(record);
  if (sale.status !== "Completed") return;

  if (sale.stockDeducted) {
    for (const line of sale.lines) {
      const stock = await getBusinessRecord(partnerId, "inventory-stock", line.sku);
      if (stock) {
        const restoredQty = Number(stock["qtyOnHand"] ?? 0) + line.qty;
        await updateBusinessRecord(partnerId, "inventory-stock", line.sku, { ...stock, qtyOnHand: restoredQty });
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
