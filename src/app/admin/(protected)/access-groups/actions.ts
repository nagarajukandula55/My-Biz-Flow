"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAccessGroup,
  updateAccessGroup,
  deleteAccessGroup,
  type PagePermission,
} from "@/lib/designer/accessGroupsData";

function parsePermissions(raw: FormDataEntryValue | null): PagePermission[] {
  if (!raw) return [];
  try {
    return JSON.parse(String(raw)) as PagePermission[];
  } catch {
    return [];
  }
}

export async function createAccessGroupAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pagePermissions = parsePermissions(formData.get("pagePermissions"));
  if (!id) throw new Error("Access Group Name is required");

  await createAccessGroup({ id, description, pagePermissions });
  revalidatePath("/admin/access-groups");
  redirect("/admin/access-groups");
}

export async function updateAccessGroupAction(id: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const pagePermissions = parsePermissions(formData.get("pagePermissions"));

  await updateAccessGroup(id, { description, pagePermissions });
  revalidatePath("/admin/access-groups");
  revalidatePath(`/admin/access-groups/${id}`);
  redirect(`/admin/access-groups/${id}`);
}

export async function deleteAccessGroupAction(id: string) {
  await deleteAccessGroup(id);
  revalidatePath("/admin/access-groups");
}
