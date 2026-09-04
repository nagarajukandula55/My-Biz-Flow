"use server";

import { revalidatePath } from "next/cache";
import { setPagePublic } from "@/lib/designer/pageAccess";
import { deleteAllPartners } from "@/lib/partnerData";

export async function setPagePublicAction(pageId: string, isPublic: boolean) {
  await setPagePublic(pageId, isPublic);
  revalidatePath("/admin/settings");
}

/**
 * Deletes every PARTNER account — deliberately NEVER platform configuration
 * (Designer customizations, document templates, module appearance,
 * numbering schemes, page-access, error log, Access Groups/Roles/Partner
 * Types). That config is the system the Super Admin is building out for
 * every future partner and must survive a demo-data wipe untouched.
 *
 * Partner-scoped BUSINESS records (workorders, invoices, BOM, inventory,
 * appointments, etc.) still live in src/lib/sample-data/* in-memory
 * arrays, not Prisma, so there's nothing there to delete yet — once those
 * migrate too, add their deleteMany() calls here alongside partner.
 */
export async function clearAllPartnerData(): Promise<{ ok: true; deletedPartners: number }> {
  const deletedPartners = await deleteAllPartners();
  revalidatePath("/", "layout");
  return { ok: true, deletedPartners };
}
