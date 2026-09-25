"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createStudent, updateStudent } from "@/lib/education";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

export async function createStudentAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const student = await createStudent(partnerId, {
    name: String(values["name"] ?? "").trim(),
    contact: values["contact"] ? String(values["contact"]) : null,
    email: values["email"] ? String(values["email"]) : null,
    guardianName: values["guardianName"] ? String(values["guardianName"]) : null,
    guardianContact: values["guardianContact"] ? String(values["guardianContact"]) : null,
  });
  revalidatePath(`/partner/${partnerId}/education/students`);
  redirect(`/partner/${partnerId}/education/students/${student.id}`);
}

export async function updateStudentAction(partnerId: string, studentId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateStudent(partnerId, studentId, {
    name: String(values["name"] ?? "").trim(),
    contact: values["contact"] ? String(values["contact"]) : null,
    email: values["email"] ? String(values["email"]) : null,
    guardianName: values["guardianName"] ? String(values["guardianName"]) : null,
    guardianContact: values["guardianContact"] ? String(values["guardianContact"]) : null,
  });
  revalidatePath(`/partner/${partnerId}/education/students`);
  revalidatePath(`/partner/${partnerId}/education/students/${studentId}`);
  redirect(`/partner/${partnerId}/education/students/${studentId}?updated=1`);
}
