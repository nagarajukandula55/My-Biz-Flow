"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import type { AttendanceEntry } from "@/lib/sample-data/education";

/**
 * Persists a real Billing invoice for a student's fee amount and marks the
 * enrollment's fee status Paid — mirrors
 * createInvoiceFromWorkorderAction in service-centre/[recordId]/actions.ts.
 * Guards against double-invoicing the same enrollment.
 */
export async function recordFeePaymentAction(partnerId: string, enrollmentId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "education", enrollmentId);
  if (!record) return;
  if (record["feeInvoiceId"]) return; // already invoiced — don't double-create
  if (record["feeStatus"] === "Paid" && record["feeInvoiceId"]) return;

  const feeAmount = Number(record["feeAmount"]) || 0;
  const taxAmount = 0; // tuition fees are typically GST-exempt/composition; no tax split modeled here
  const totalAmount = feeAmount + taxAmount;

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["studentName"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: record["feeDueDate"] ?? new Date().toISOString().slice(0, 10),
    lineItemsSummary: `Course fee — ${record["course"] ?? ""} (${record["batch"] ?? ""})`,
    subtotal: feeAmount,
    taxAmount,
    totalAmount,
    paymentStatus: "Paid",
    paymentMode: undefined,
    sourceEnrollmentId: enrollmentId,
  });

  await updateBusinessRecord(partnerId, "education", enrollmentId, {
    ...record,
    feeStatus: "Paid",
    feeInvoiceId: invoice.id,
  });
  revalidatePath(`/partner/${partnerId}/education/${enrollmentId}`);
}

/**
 * Appends a {date, present} entry to the enrollment's running attendance
 * log — one entry per calendar date (marking the same date again replaces
 * that day's entry rather than duplicating it).
 */
export async function markAttendanceAction(
  partnerId: string,
  enrollmentId: string,
  present: boolean,
  date?: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "education", enrollmentId);
  if (!record) return;
  const day = date ?? new Date().toISOString().slice(0, 10);
  const log = ((record["attendanceLog"] as AttendanceEntry[] | undefined) ?? []).filter((e) => e.date !== day);
  const nextLog: AttendanceEntry[] = [...log, { date: day, present }].sort((a, b) => a.date.localeCompare(b.date));

  await updateBusinessRecord(partnerId, "education", enrollmentId, {
    ...record,
    attendanceLog: nextLog,
  });
  revalidatePath(`/partner/${partnerId}/education/${enrollmentId}`);
}
