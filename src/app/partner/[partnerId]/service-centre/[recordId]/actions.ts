"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { extractLifecycleFromRecord, type ServiceLine } from "@/lib/sample-data/service-centre";

/**
 * Deducts consumed part-line quantities from live Inventory stock
 * ("inventory-stock" module, keyed by BOM material id — same module/keying
 * completeSaleAction in pos/checkout/actions.ts already deducts against),
 * fired once per workorder as a side effect of the Completed stage
 * transition (mirrors how POS checkout deducts at sale completion). Read-
 * modify-write against BusinessRecord's JSON blob — same documented
 * limitation as completeSaleAction, not a DB-level atomic decrement.
 * Guarded by `inventoryDeducted` on the workorder record so re-entering
 * Completed (e.g. after a later edit) never double-deducts.
 */
export async function deductInventoryForWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
  const lifecycle = extractLifecycleFromRecord(record);
  if (lifecycle.inventoryDeducted) return; // already deducted — don't double-count
  if (lifecycle.partLines.length === 0) {
    await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
    return;
  }

  const stockRecords = await listBusinessRecords(partnerId, "inventory-stock");
  const stockById = new Map(stockRecords.map((r) => [String(r["id"]), r]));

  for (const line of lifecycle.partLines) {
    if (line.pending) continue; // never fulfilled — nothing to deduct
    const stock = stockById.get(line.materialId);
    if (!stock) continue; // no matching stock record — best-effort, doesn't block the job
    const currentQty = Number(stock["quantityOnHand"] ?? 0);
    const newQty = Math.max(0, currentQty - (line.qty || 1));
    await updateBusinessRecord(partnerId, "inventory-stock", line.materialId, { ...stock, quantityOnHand: newQty });
    stockById.set(line.materialId, { ...stock, quantityOnHand: newQty });
  }

  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, inventoryDeducted: true });
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
}

/**
 * Persists a real Billing invoice from a Closed workorder's lines —
 * distinct from the read-only computed render at
 * service-centre/[recordId]/invoice/page.tsx, which still shows the
 * document itself. Warranty jobs (warrantyFlag on the workorder record)
 * are non-chargeable: every line's amount is zeroed here rather than
 * silently charging a warranty repair, mirroring the same rule an
 * out-of-warranty job's charges depend on.
 *
 * Bind with .bind(null, partnerId, workorderId) before calling from a
 * client button.
 */
export async function createInvoiceFromWorkorderAction(partnerId: string, workorderId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
  const lifecycle = extractLifecycleFromRecord(record);
  if (lifecycle.stage !== "Closed") return;
  if (lifecycle.invoiceId) return; // already invoiced — don't double-create

  const underWarranty = Boolean(record["warrantyFlag"]);
  const laborTotal = underWarranty ? 0 : lifecycle.serviceLines.reduce((sum, l) => sum + (l.laborCharge || 0), 0);
  const partsTotal = 0; // part pricing lives in Inventory's own rate — this pass totals labor only, same scope as the existing invoice render
  const subtotal = laborTotal + partsTotal;
  const taxAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + taxAmount;

  const lineSummary = underWarranty
    ? `Warranty repair — no charge (${lifecycle.serviceLines.length} service line(s))`
    : lifecycle.serviceLines.map((l: ServiceLine) => `${l.solutionLabel} (₹${l.laborCharge})`).join(", ");

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["customer"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: lineSummary || "No chargeable lines",
    subtotal,
    taxAmount,
    totalAmount,
    paymentStatus: underWarranty ? "Paid" : "Draft",
    paymentMode: undefined,
    sourceWorkorderId: workorderId,
  });

  await updateBusinessRecord(partnerId, "service-centre", workorderId, { ...record, invoiceId: invoice.id });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}/invoice`);
}

/**
 * Toggles the workorder's Hold (Parts Pending) side-state — separate from
 * the four main lifecycle stages, mirroring a job that's paused mid-repair
 * waiting on a spare rather than cancelled or actually progressing.
 */
export async function setWorkorderHoldAction(
  partnerId: string,
  workorderId: string,
  hold: boolean,
  reason?: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "service-centre", workorderId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "service-centre", workorderId, {
    ...record,
    onHold: hold,
    holdReason: hold ? reason ?? "Awaiting parts" : undefined,
    holdSince: hold ? new Date().toISOString() : undefined,
  });
  revalidatePath(`/partner/${partnerId}/service-centre/${workorderId}`);
}
