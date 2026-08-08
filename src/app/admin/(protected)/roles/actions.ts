"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createRole, updateRole, deleteRole } from "@/lib/designer/rolesData";

function parseAccessGroupIds(formData: FormData): string[] {
  return formData.getAll("accessGroupIds").map(String).filter(Boolean);
}

export async function createRoleAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const accessGroupIds = parseAccessGroupIds(formData);
  if (!id) throw new Error("Role Name is required");

  await createRole({ id, description, accessGroupIds });
  revalidatePath("/admin/roles");
  redirect("/admin/roles");
}

export async function updateRoleAction(id: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const accessGroupIds = parseAccessGroupIds(formData);

  await updateRole(id, { description, accessGroupIds });
  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${id}`);
  redirect(`/admin/roles/${id}`);
}

export async function deleteRoleAction(id: string) {
  await deleteRole(id);
  revalidatePath("/admin/roles");
}
