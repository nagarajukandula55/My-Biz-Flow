"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { extractLifecycleFromRecord, type ServiceLine } from "@/lib/sample-data/service-centre";

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
