"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { upsertPayslip, setPayslipStatus } from "@/lib/hrms";

export async function createPayslipAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const employeeId = String(values["employeeId"] ?? "").trim();
  const month = Number(values["month"]);
  const year = Number(values["year"]);
  const basicPayRupees = Number(values["basicPay"] ?? 0);
  if (!employeeId) return { error: "Employee is required." };
  if (!month || month < 1 || month > 12) return { error: "Month must be between 1 and 12." };
  if (!year) return { error: "Year is required." };
  if (!basicPayRupees || basicPayRupees <= 0) return { error: "Basic pay must be greater than zero." };
  const allowancesRupees = Number(values["allowances"] ?? 0) || 0;
  const deductionsRupees = Number(values["deductions"] ?? 0) || 0;

  await upsertPayslip(partnerId, { employeeId, month, year, basicPayRupees, allowancesRupees, deductionsRupees });
  revalidatePath(`/partner/${partnerId}/hrms/payroll`);
  redirect(`/partner/${partnerId}/hrms/payroll`);
}

export async function setPayslipStatusAction(partnerId: string, payslipId: string, status: string): Promise<{ error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  try {
    await setPayslipStatus(partnerId, payslipId, status);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update payslip." };
  }
  revalidatePath(`/partner/${partnerId}/hrms/payroll`);
  return {};
}
