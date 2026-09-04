"use server";

import { revalidatePath } from "next/cache";
import { issueAccessKey, revokeAccessKey } from "@/lib/designer/accessKeys";

export async function issueAccessKeyAction(formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const moduleSlug = String(formData.get("moduleSlug") ?? "").trim();
  if (!partnerId || !moduleSlug) throw new Error("Partner and module are required");

  await issueAccessKey(partnerId, moduleSlug);
  revalidatePath("/admin/access-keys");
}

export async function revokeAccessKeyAction(formData: FormData) {
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const moduleSlug = String(formData.get("moduleSlug") ?? "").trim();
  if (!partnerId || !moduleSlug) throw new Error("Partner and module are required");

  await revokeAccessKey(partnerId, moduleSlug);
  revalidatePath("/admin/access-keys");
}
