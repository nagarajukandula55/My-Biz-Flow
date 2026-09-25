"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createBatch,
  updateBatch,
  createEnrollment,
  BatchAtCapacityError,
  addFeeInstallment,
  markFeeInstallmentPaid,
  upsertClassAttendance,
} from "@/lib/education";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

export async function createBatchAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const batch = await createBatch(partnerId, {
    courseId: String(values["courseId"] ?? ""),
    batchName: String(values["batchName"] ?? "").trim(),
    startDate: values["startDate"] ? new Date(String(values["startDate"])) : null,
    endDate: values["endDate"] ? new Date(String(values["endDate"])) : null,
    status: values["status"] ? String(values["status"]) : "Upcoming",
    capacity: values["capacity"] !== "" && values["capacity"] != null ? Number(values["capacity"]) : null,
  });
  revalidatePath(`/partner/${partnerId}/education/batches`);
  redirect(`/partner/${partnerId}/education/batches/${batch.id}`);
}

export async function updateBatchAction(partnerId: string, batchId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateBatch(partnerId, batchId, {
    courseId: values["courseId"] ? String(values["courseId"]) : undefined,
    batchName: String(values["batchName"] ?? "").trim(),
    startDate: values["startDate"] ? new Date(String(values["startDate"])) : null,
    endDate: values["endDate"] ? new Date(String(values["endDate"])) : null,
    status: values["status"] ? String(values["status"]) : undefined,
    capacity: values["capacity"] !== "" && values["capacity"] != null ? Number(values["capacity"]) : null,
  });
  revalidatePath(`/partner/${partnerId}/education/batches`);
  revalidatePath(`/partner/${partnerId}/education/batches/${batchId}`);
  redirect(`/partner/${partnerId}/education/batches/${batchId}?updated=1`);
}

/**
 * Enrolls a student into a batch, fail-closed against capacity (see
 * createEnrollment's BatchAtCapacityError). Returns a plain
 * { error } instead of throwing so the client panel can show an inline
 * message rather than an unhandled rejection.
 */
export async function enrollStudentAction(
  partnerId: string,
  batchId: string,
  studentId: string
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!studentId) return { error: "Pick a student to enroll." };
  try {
    await createEnrollment(partnerId, batchId, studentId);
  } catch (err) {
    if (err instanceof BatchAtCapacityError) return { error: err.message };
    return { error: "Could not enroll this student." };
  }
  revalidatePath(`/partner/${partnerId}/education/batches/${batchId}`);
  return {};
}

export async function addFeeInstallmentAction(
  partnerId: string,
  batchId: string,
  enrollmentId: string,
  dueDate: string,
  amountRupees: number
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!dueDate || !Number.isFinite(amountRupees) || amountRupees <= 0) {
    return { error: "Enter a valid due date and amount." };
  }
  try {
    await addFeeInstallment(partnerId, enrollmentId, {
      dueDate: new Date(dueDate),
      amount: Math.round(amountRupees * 100),
    });
  } catch {
    return { error: "Could not add the installment." };
  }
  revalidatePath(`/partner/${partnerId}/education/batches/${batchId}`);
  return {};
}

export async function markFeeInstallmentPaidAction(
  partnerId: string,
  batchId: string,
  installmentId: string,
  paidAmountRupees: number
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!Number.isFinite(paidAmountRupees) || paidAmountRupees <= 0) {
    return { error: "Enter a valid paid amount." };
  }
  try {
    await markFeeInstallmentPaid(partnerId, installmentId, Math.round(paidAmountRupees * 100));
  } catch {
    return { error: "Could not record this payment." };
  }
  revalidatePath(`/partner/${partnerId}/education/batches/${batchId}`);
  return {};
}

export async function markClassAttendanceAction(
  partnerId: string,
  batchId: string,
  studentId: string,
  date: string,
  status: "Present" | "Absent" | "Late"
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  try {
    await upsertClassAttendance(partnerId, batchId, studentId, new Date(date), status);
  } catch {
    return { error: "Could not save attendance." };
  }
  revalidatePath(`/partner/${partnerId}/education/batches/${batchId}`);
  return {};
}
