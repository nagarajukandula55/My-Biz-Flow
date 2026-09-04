"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { computeOrderLineTotal } from "@/lib/sample-data/wholesale-b2b";
import { getPartner } from "@/lib/partnerData";
import { notifyCentralApiBillingInvoice } from "@/lib/centralApi";

/**
 * Sums this dealer's own unpaid order totals — every order not yet
 * Delivered counts as outstanding against their credit limit (a proxy for
 * "not yet paid" in the absence of a separate ledger/payments module).
 * excludeOrderId lets an edit exclude the order being edited from its own
 * running total.
 */
async function dealerOutstandingBalance(partnerId: string, dealerName: string, excludeOrderId?: string): Promise<number> {
  const orders = await listBusinessRecords(partnerId, "wholesale-b2b");
  return orders
    .filter((r) => String(r["dealerName"] ?? "") === dealerName && String(r["id"]) !== excludeOrderId && r["status"] !== "Delivered")
    .reduce((sum, r) => sum + Number(r["bulkPriceTotal"] ?? 0), 0);
}

/**
 * Creates a wholesale order: recomputes the tiered/bulk price server-side
 * (never trusts client math — same rule as completeSaleAction in
 * pos/checkout/actions.ts), then blocks the order if it would push the
 * dealer's outstanding balance over their credit limit (fail closed, same
 * pattern as POS's insufficient-stock check). Bind with
 * .bind(null, partnerId) before passing as a RecordForm `action` prop.
 */
export async function createWholesaleOrderAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  const dealerName = String(values["dealerName"] ?? "").trim();
  if (!dealerName) throw new Error("Dealer / Distributor is required.");

  const quantity = Number(values["itemQuantity"]) || 0;
  const listPrice = Number(values["itemListPrice"]) || 0;
  if (quantity <= 0 || listPrice <= 0) {
    throw new Error("Enter a valid Quantity and List Price — bulk pricing is computed from these.");
  }

  const { unitPrice, discountPercent, lineTotal } = computeOrderLineTotal(quantity, listPrice);
  const creditLimit = Number(values["creditLimit"]) || 0;
  const outstanding = await dealerOutstandingBalance(partnerId, dealerName);
  if (creditLimit > 0 && outstanding + lineTotal > creditLimit) {
    throw new Error(
      `This order (₹${lineTotal}) would push ${dealerName}'s outstanding balance to ₹${Math.round(outstanding + lineTotal)}, over their ₹${creditLimit} credit limit (currently ₹${Math.round(outstanding)} outstanding). Reduce the order quantity, collect payment on existing orders, or raise the credit limit first.`
    );
  }

  const record = await createBusinessRecord(partnerId, "wholesale-b2b", {
    id: values["id"],
    dealerName,
    orderDate: values["orderDate"],
    itemsSummary: values["itemsSummary"],
    itemQuantity: quantity,
    itemListPrice: listPrice,
    unitPrice,
    discountPercent,
    bulkPriceTotal: lineTotal,
    creditTermDays: values["creditTermDays"] === "" ? undefined : Number(values["creditTermDays"]),
    creditLimit,
    status: values["status"] || "Placed",
  });

  revalidatePath(`/partner/${partnerId}/wholesale-b2b`);
  redirect(`/partner/${partnerId}/wholesale-b2b/${record.id}`);
}

/**
 * Same recompute + credit-limit gate as createWholesaleOrderAction, for an
 * existing order. Bind with .bind(null, partnerId, recordKey).
 */
export async function updateWholesaleOrderAction(
  partnerId: string,
  recordKey: string,
  values: Record<string, unknown>
): Promise<void> {
  const existing = await getBusinessRecord(partnerId, "wholesale-b2b", recordKey);
  if (!existing) throw new Error("Order not found.");

  const dealerName = String(values["dealerName"] ?? "").trim();
  if (!dealerName) throw new Error("Dealer / Distributor is required.");

  const quantity = Number(values["itemQuantity"]) || 0;
  const listPrice = Number(values["itemListPrice"]) || 0;
  if (quantity <= 0 || listPrice <= 0) {
    throw new Error("Enter a valid Quantity and List Price — bulk pricing is computed from these.");
  }

  const { unitPrice, discountPercent, lineTotal } = computeOrderLineTotal(quantity, listPrice);
  const creditLimit = Number(values["creditLimit"]) || 0;
  const outstanding = await dealerOutstandingBalance(partnerId, dealerName, recordKey);
  if (creditLimit > 0 && outstanding + lineTotal > creditLimit) {
    throw new Error(
      `This order (₹${lineTotal}) would push ${dealerName}'s outstanding balance to ₹${Math.round(outstanding + lineTotal)}, over their ₹${creditLimit} credit limit (currently ₹${Math.round(outstanding)} outstanding, excluding this order). Reduce the order quantity, collect payment on existing orders, or raise the credit limit first.`
    );
  }

  await updateBusinessRecord(partnerId, "wholesale-b2b", recordKey, {
    ...existing,
    dealerName,
    orderDate: values["orderDate"],
    itemsSummary: values["itemsSummary"],
    itemQuantity: quantity,
    itemListPrice: listPrice,
    unitPrice,
    discountPercent,
    bulkPriceTotal: lineTotal,
    creditTermDays: values["creditTermDays"] === "" ? undefined : Number(values["creditTermDays"]),
    creditLimit,
    status: values["status"],
  });

  revalidatePath(`/partner/${partnerId}/wholesale-b2b`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/${recordKey}`);
  redirect(`/partner/${partnerId}/wholesale-b2b/${recordKey}`);
}

/**
 * Creates a real Billing invoice from a dispatched/delivered order,
 * reflecting the tiered price computed at order time — mirrors
 * createInvoiceFromWorkorderAction in
 * service-centre/[recordId]/actions.ts, plus pushes it to AN-Accounting
 * via notifyCentralApiBillingInvoice (that step is missing from the
 * service-centre/POS direct-invoice paths today — included here so this
 * module's invoices show up in AN-Accounting like the ones created via
 * the generic Billing form do).
 */
export async function createInvoiceFromWholesaleOrderAction(partnerId: string, orderId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "wholesale-b2b", orderId);
  if (!record) return;
  if (record["invoiceId"]) return; // already invoiced — don't double-create

  const subtotal = Number(record["bulkPriceTotal"] ?? 0);
  const taxAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + taxAmount;
  const quantity = Number(record["itemQuantity"] ?? 0);
  const unitPrice = Number(record["unitPrice"] ?? 0);
  const discountPercent = Number(record["discountPercent"] ?? 0);

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: String(record["dealerName"] ?? ""),
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: `${record["itemsSummary"] ?? ""} — Qty ${quantity} @ ₹${unitPrice}/unit (${discountPercent}% bulk discount)`,
    subtotal,
    taxAmount,
    totalAmount,
    paymentStatus: "Draft",
    sourceWholesaleOrderId: orderId,
  });

  const partner = await getPartner(partnerId);
  if (partner) {
    await notifyCentralApiBillingInvoice(partner, {
      externalOrderId: String(invoice.id),
      customer: String(record["dealerName"] ?? ""),
      items: [
        {
          description: String(record["itemsSummary"] ?? "Bulk order"),
          quantity,
          unitPrice,
          taxRate: 18,
        },
      ],
      totalAmount,
    });
  }

  await updateBusinessRecord(partnerId, "wholesale-b2b", orderId, { ...record, invoiceId: invoice.id });
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/${orderId}`);
}
