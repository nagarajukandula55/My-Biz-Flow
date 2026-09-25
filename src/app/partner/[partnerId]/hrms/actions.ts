"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createEmployee, updateEmployee, type EmployeeInput } from "@/lib/hrms";

function parseEmployeeValues(values: Record<string, unknown>): EmployeeInput | { error: string } {
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };
  return {
    name,
    contact: values["contact"] ? String(values["contact"]) : undefined,
    email: values["email"] ? String(values["email"]) : undefined,
    department: values["department"] ? String(values["department"]) : undefined,
    designation: values["designation"] ? String(values["designation"]) : undefined,
    reportingManagerId: values["reportingManagerId"] ? String(values["reportingManagerId"]) : undefined,
    joiningDate: values["joiningDate"] ? new Date(String(values["joiningDate"])) : undefined,
    status: values["status"] ? String(values["status"]) : undefined,
  };
}

export async function createEmployeeAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseEmployeeValues(values);
  if ("error" in parsed) return { error: parsed.error };
  const employee = await createEmployee(partnerId, parsed);
  revalidatePath(`/partner/${partnerId}/hrms`);
  redirect(`/partner/${partnerId}/hrms/${employee.id}`);
}

export async function updateEmployeeAction(
  partnerId: string,
  employeeId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseEmployeeValues(values);
  if ("error" in parsed) return { error: parsed.error };
  await updateEmployee(partnerId, employeeId, parsed);
  revalidatePath(`/partner/${partnerId}/hrms`);
  revalidatePath(`/partner/${partnerId}/hrms/${employeeId}`);
  redirect(`/partner/${partnerId}/hrms/${employeeId}`);
}
