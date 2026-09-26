"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createPatient, updatePatient } from "@/lib/clinic";

export async function createPatientAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Patient name is required." };
  const patient = await createPatient(partnerId, {
    name,
    phone: values["phone"] ? String(values["phone"]) : undefined,
    email: values["email"] ? String(values["email"]) : undefined,
    insuranceProvider: values["insuranceProvider"] ? String(values["insuranceProvider"]) : undefined,
  });
  revalidatePath(`/partner/${partnerId}/clinic/patients`);
  redirect(`/partner/${partnerId}/clinic/patients/${patient.id}`);
}

export async function updatePatientAction(
  partnerId: string,
  patientId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Patient name is required." };
  await updatePatient(partnerId, patientId, {
    name,
    phone: values["phone"] ? String(values["phone"]) : undefined,
    email: values["email"] ? String(values["email"]) : undefined,
    insuranceProvider: values["insuranceProvider"] ? String(values["insuranceProvider"]) : undefined,
  });
  revalidatePath(`/partner/${partnerId}/clinic/patients`);
  revalidatePath(`/partner/${partnerId}/clinic/patients/${patientId}`);
  redirect(`/partner/${partnerId}/clinic/patients/${patientId}`);
}
