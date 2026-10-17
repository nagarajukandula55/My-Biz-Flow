"use server";
import { revalidatePath } from "next/cache";
import { saveAttendancePolicy, correctAttendance } from "@/lib/hrms";

export async function savePolicyAction(partnerId: string, employeeId: string, values: Record<string, unknown>) {
  try { await saveAttendancePolicy(partnerId, employeeId, values); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not save policy." }; }
  revalidatePath(`/partner/${partnerId}/hrms/${employeeId}`);
}

export async function correctAttendanceAction(partnerId: string, attendanceId: string, expected: string, values: Record<string, unknown>) {
  try { await correctAttendance(partnerId, attendanceId, { ...values, expected }); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not correct attendance." }; }
  revalidatePath(`/partner/${partnerId}/hrms`, "layout");
}
