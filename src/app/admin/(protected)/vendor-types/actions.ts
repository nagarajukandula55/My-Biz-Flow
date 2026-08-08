"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createVendorType,
  updateVendorType,
  deleteVendorType,
  type VendorTypeInput,
  type PlanTier,
} from "@/lib/designer/vendorTypesData";

function parseInput(formData: FormData): VendorTypeInput {
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
    requiresApproval: formData.get("requiresApproval") === "on",
    status: String(formData.get("status") ?? "Active"),
  };
}

export async function createVendorTypeAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Vendor Type Name is required");

  await createVendorType(id, parseInput(formData));
  revalidatePath("/admin/vendor-types");
  redirect("/admin/vendor-types");
}

export async function updateVendorTypeAction(id: string, formData: FormData) {
  await updateVendorType(id, parseInput(formData));
  revalidatePath("/admin/vendor-types");
  revalidatePath(`/admin/vendor-types/${id}`);
  redirect(`/admin/vendor-types/${id}`);
}

export async function deleteVendorTypeAction(id: string) {
  await deleteVendorType(id);
  revalidatePath("/admin/vendor-types");
}
