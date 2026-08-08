"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createVendorType, updateVendorType, deleteVendorType, type VendorTypeInput } from "@/lib/designer/vendorTypesData";

function parseInput(formData: FormData): VendorTypeInput {
  return {
    description: String(formData.get("description") ?? "").trim(),
    defaultModules: formData.getAll("defaultModules").map(String).filter(Boolean),
    assignableRoleIds: formData.getAll("assignableRoleIds").map(String).filter(Boolean),
    planIds: formData.getAll("planIds").map(String).filter(Boolean),
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
