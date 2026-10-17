"use server";
import { issueEmployeeAccess } from "@/lib/hrmsEmployeeAccess";
export async function employeeAccessAction(partnerId: string, values: Record<string, unknown>) {
  if (values.operation !== "Disable" && values.operation !== "Issue or reset password") throw new Error("Select an employee access action.");
  return issueEmployeeAccess(partnerId, String(values.employeeId ?? ""), values.operation === "Disable");
}
