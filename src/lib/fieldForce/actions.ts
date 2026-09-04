"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { onboardEngineer, setEngineerStatus, type ServiceAreaInput } from "@/lib/fieldForce/engineersData";
import { createService, setServiceActive } from "@/lib/fieldForce/servicesData";
import { allocateEngineer, updateAllocationStatus } from "@/lib/fieldForce/allocationsData";

export async function onboardEngineerAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);

  const areasRaw = String(formData.get("serviceAreas") ?? "[]");
  let serviceAreas: ServiceAreaInput[] = [];
  try {
    serviceAreas = JSON.parse(areasRaw);
  } catch {
    serviceAreas = [];
  }

  if (!name || !phone) throw new Error("Name and phone are required");
  if (serviceIds.length === 0) throw new Error("Select at least one service");
  if (serviceAreas.length === 0) throw new Error("Add at least one serviceable area");

  await onboardEngineer({ name, phone, email, source, serviceIds, serviceAreas });
  revalidatePath(`/partner/${partnerId}/field-force`);
  redirect(`/partner/${partnerId}/field-force`);
}

export async function setEngineerStatusAction(partnerId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "pending" | "active" | "suspended";
  await setEngineerStatus(id, status);
  revalidatePath(`/partner/${partnerId}/field-force`);
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function createServiceAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  if (!name || !category) throw new Error("Service name and category are required");
  await createService(name, category);
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function setServiceActiveAction(partnerId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  await setServiceActive(id, isActive);
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function allocateEngineerAction(partnerId: string, formData: FormData) {
  const jobRef = String(formData.get("jobRef") ?? "").trim();
  const engineerId = String(formData.get("engineerId") ?? "");
  if (!jobRef || !engineerId) throw new Error("Job reference and engineer are required");
  await allocateEngineer(partnerId, jobRef, engineerId);
  revalidatePath(`/partner/${partnerId}/field-force/allocations`);
}

export async function updateAllocationStatusAction(partnerId: string, formData: FormData) {
  const allocationId = String(formData.get("allocationId") ?? "");
  const status = String(formData.get("status") ?? "") as "assigned" | "in-progress" | "done" | "cancelled";
  await updateAllocationStatus(allocationId, partnerId, status);
  revalidatePath(`/partner/${partnerId}/field-force/allocations`);
}
