"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { loginEmployee, getEmployeeSession, changeEmployeePassword, EMPLOYEE_COOKIE } from "@/lib/hrmsEmployeeAccess";
import { checkIn, checkOut } from "@/lib/hrms";
import { validateAttendanceLocation, type AttendanceLocation } from "@/lib/attendanceLocation";

export async function employeeLoginAction(partnerId: string, values: Record<string, unknown>) {
  try {
    const ok = await loginEmployee(partnerId, String(values.loginId ?? "").trim(), String(values.password ?? ""));
    if (!ok) return { error: "Unable to sign in. Check your credentials or try again after 15 minutes." };
    revalidatePath(`/partner/${partnerId}/hrms/employee`);
    return {};
  } catch { return { error: "Employee sign-in is unavailable. Contact your business administrator." }; }
}
export async function employeePasswordAction(partnerId: string, values: Record<string, unknown>) {
  try {
    await changeEmployeePassword(partnerId, String(values.password ?? ""), String(values.confirmation ?? ""));
    revalidatePath(`/partner/${partnerId}/hrms/employee`);
    return {};
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not change password." }; }
}
export async function employeeLogoutAction() { cookies().delete(EMPLOYEE_COOKIE); }

export async function employeePunchAction(partnerId: string, mode: "in" | "out", location: AttendanceLocation) {
  const session = await getEmployeeSession(partnerId);
  if (!session) return { ok: false as const, error: "Your session has expired. Please sign in again." };
  if (mode !== "in" && mode !== "out") return { ok: false as const, error: "Invalid attendance action." };
  const error = validateAttendanceLocation(location);
  if (error) return { ok: false as const, error };
  // Identity is exclusively obtained from the signed session, never the request.
  try {
    const result = await (mode === "in" ? checkIn : checkOut)(partnerId, session.employee.id, location.lat, location.lng);
    revalidatePath(`/partner/${partnerId}/hrms/employee`);
    revalidatePath(`/partner/${partnerId}/hrms/attendance`);
    return result;
  } catch { return { ok: false as const, error: "Attendance could not be saved. Please retry or contact your administrator." }; }
}
