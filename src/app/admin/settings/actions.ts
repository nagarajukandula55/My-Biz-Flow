"use server";

import { revalidatePath } from "next/cache";
import { setPagePublic } from "@/lib/designer/pageAccess";

export async function setPagePublicAction(pageId: string, isPublic: boolean) {
  await setPagePublic(pageId, isPublic);
  revalidatePath("/admin/settings");
}
