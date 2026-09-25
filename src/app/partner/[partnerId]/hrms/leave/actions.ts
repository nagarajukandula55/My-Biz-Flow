"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createLeaveRequest, decideLeaveRequest } from "@/lib/hrms";

export async function createLeaveRequestAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const employeeId = String(values["employeeId"] ?? "").trim();
  const leaveType = String(values["leaveType"] ?? "").trim();
  const startDate = values["startDate"] ? new Date(String(values["startDate"])) : undefined;
  const endDate = values["endDate"] ? new Date(String(values["endDate"])) : undefined;
  if (!employeeId) return { error: "Employee is required." };
  if (!leaveType) return { error: "Leave type is required." };
  if (!startDate || !endDate) return { error: "Start and end date are required." };
  const reason = values["reason"] ? String(values["reason"]) : undefined;
  await createLeaveRequest(partnerId, { employeeId, leaveType, startDate, endDate, reason });
  revalidatePath(`/partner/${partnerId}/hrms/leave`);
  redirect(`/partner/${partnerId}/hrms/leave`);
}

export async function decideLeaveRequestAction(
  partnerId: string,
  leaveId: string,
  decision: "Approved" | "Rejected"
): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const result = await decideLeaveRequest(partnerId, leaveId, decision, partnerId);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/partner/${partnerId}/hrms/leave`);
  return {};
}
