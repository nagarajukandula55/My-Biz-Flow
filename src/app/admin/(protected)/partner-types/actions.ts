"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPartnerType,
  updatePartnerType,
  deletePartnerType,
  type PartnerTypeInput,
  type PlanTier,
} from "@/lib/designer/partnerTypesData";

function parseInput(formData: FormData): PartnerTypeInput {
  const defaultModules = String(formData.get("defaultModules") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  let planTierByPage: Record<string, PlanTier> = {};
  try {
    planTierByPage = JSON.parse(String(formData.get("planTierByPage") ?? "{}"));
  } catch {
    planTierByPage = {};
  }

  return {
    description: String(formData.get("description") ?? "").trim(),
    defaultModules,
    assignableRoleIds: formData.getAll("assignableRoleIds").map(String).filter(Boolean),
    planTierByPage,
    planIds: formData.getAll("planIds").map(String).filter(Boolean),
    requiresApproval: formData.get("requiresApproval") === "on",
    status: String(formData.get("status") ?? "Active"),
  };
}

export async function createPartnerTypeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Partner Type Name is required");

  await createPartnerType(id, parseInput(formData));
  revalidatePath("/admin/partner-types");
  redirect("/admin/partner-types");
}

export async function updatePartnerTypeAction(id: string, formData: FormData) {
  await updatePartnerType(id, parseInput(formData));
  revalidatePath("/admin/partner-types");
  revalidatePath(`/admin/partner-types/${id}`);
  redirect(`/admin/partner-types/${id}`);
}

export async function deletePartnerTypeAction(id: string) {
  await deletePartnerType(id);
  revalidatePath("/admin/partner-types");
}
