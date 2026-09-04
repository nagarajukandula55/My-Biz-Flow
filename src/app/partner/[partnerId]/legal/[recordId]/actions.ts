"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { computeTimeLogTotal, MATTER_STAGES, type MatterStage, type TimeLogEntry } from "@/lib/sample-data/legal";

/**
 * Appends a {date, hours, description, rate} billable-hours entry to the
 * matter's running time log, and syncs the legacy billableHours column
 * (sum of logged hours) so the list view stays consistent with the detail
 * panel's running total.
 */
export async function logHoursAction(
  partnerId: string,
  matterId: string,
  entry: { date: string; hours: number; description: string; rate: number }
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "legal", matterId);
  if (!record) return;

  const hours = Number(entry.hours) || 0;
  const rate = Number(entry.rate) || Number(record["hourlyRate"]) || 0;
  if (hours <= 0) return;

  const log = (record["timeLog"] as TimeLogEntry[] | undefined) ?? [];
  const next: TimeLogEntry[] = [
    ...log,
    { id: `TL-${Date.now()}`, date: entry.date, hours, description: entry.description, rate },
  ];

  await updateBusinessRecord(partnerId, "legal", matterId, {
    ...record,
    timeLog: next,
    billableHours: next.reduce((s, e) => s + (Number(e.hours) || 0), 0),
  });
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);
}

/**
 * Advances (or sets) the matter's stage stepper. Reaching "Resolved"
 * auto-triggers invoice generation from the accumulated billable-hours
 * total, same as the explicit Generate Invoice action below.
 */
export async function setMatterStageAction(partnerId: string, matterId: string, stage: MatterStage): Promise<void> {
  const record = await getBusinessRecord(partnerId, "legal", matterId);
  if (!record) return;
  if (!MATTER_STAGES.includes(stage)) return;

  await updateBusinessRecord(partnerId, "legal", matterId, { ...record, stage });
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);

  if (stage === "Resolved") {
    await createInvoiceFromMatterAction(partnerId, matterId);
  }
}

/**
 * Creates a real Billing invoice from the matter's accumulated billable
 * hours (hours * rate per logged entry, recomputed server-side — never
 * trust a client total) — mirrors createInvoiceFromWorkorderAction in
 * service-centre/[recordId]/actions.ts. Guards against double-invoicing.
 */
export async function createInvoiceFromMatterAction(partnerId: string, matterId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "legal", matterId);
  if (!record) return;
  if (record["invoiceId"]) return; // already invoiced — don't double-create

  const log = (record["timeLog"] as TimeLogEntry[] | undefined) ?? [];
  const subtotal = computeTimeLogTotal(log);
  const taxAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + taxAmount;
  const totalHours = log.reduce((s, e) => s + (Number(e.hours) || 0), 0);

  const lineSummary =
    log.length > 0
      ? log.map((e) => `${e.description} — ${e.hours}h @ ₹${e.rate}/hr`).join("; ")
      : `${totalHours}h @ ₹${record["hourlyRate"] ?? 0}/hr (no itemized log)`;

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["client"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    lineItemsSummary: lineSummary,
    subtotal,
    taxAmount,
    totalAmount,
    paymentStatus: "Draft",
    paymentMode: undefined,
    sourceMatterId: matterId,
  });

  await updateBusinessRecord(partnerId, "legal", matterId, { ...record, invoiceId: invoice.id });
  revalidatePath(`/partner/${partnerId}/legal/${matterId}`);
}
