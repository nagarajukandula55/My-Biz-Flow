"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCourse, updateCourse } from "@/lib/education";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

export async function createCourseAction(partnerId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const course = await createCourse(partnerId, {
    name: String(values["name"] ?? "").trim(),
    durationWeeks: values["durationWeeks"] !== "" && values["durationWeeks"] != null ? Number(values["durationWeeks"]) : null,
    fee: Math.round(Number(values["fee"] ?? 0) * 100), // rupees entered -> paise stored
    isActive: values["isActive"] !== false,
  });
  revalidatePath(`/partner/${partnerId}/education/courses`);
  redirect(`/partner/${partnerId}/education/courses/${course.id}`);
}

export async function updateCourseAction(partnerId: string, courseId: string, values: Record<string, unknown>): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateCourse(partnerId, courseId, {
    name: String(values["name"] ?? "").trim(),
    durationWeeks: values["durationWeeks"] !== "" && values["durationWeeks"] != null ? Number(values["durationWeeks"]) : null,
    fee: Math.round(Number(values["fee"] ?? 0) * 100),
    isActive: values["isActive"] !== false,
  });
  revalidatePath(`/partner/${partnerId}/education/courses`);
  revalidatePath(`/partner/${partnerId}/education/courses/${courseId}`);
  redirect(`/partner/${partnerId}/education/courses/${courseId}?updated=1`);
}
