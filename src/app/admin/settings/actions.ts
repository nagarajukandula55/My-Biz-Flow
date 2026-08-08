"use server";

import { revalidatePath } from "next/cache";
import { setPagePublic } from "@/lib/designer/pageAccess";

export async function setPagePublicAction(pageId: string, isPublic: boolean) {
  setPagePublic(pageId, isPublic);
  revalidatePath("/admin/settings");
}
