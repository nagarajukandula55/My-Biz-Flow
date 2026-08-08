"use server";

import { revalidatePath } from "next/cache";
import { setPagePublic } from "@/lib/designer/pageAccess";
import { deleteAllVendors } from "@/lib/vendorData";

export async function setPagePublicAction(pageId: string, isPublic: boolean) {
  await setPagePublic(pageId, isPublic);
  revalidatePath("/admin/settings");
}

/**
 * Deletes every VENDOR account — deliberately NEVER platform configuration
 * (Designer customizations, document templates, module appearance,
 * numbering schemes, page-access, error log, Access Groups/Roles/Vendor
 * Types). That config is the system the Super Admin is building out for
 * every future vendor and must survive a demo-data wipe untouched.
 *
 * Vendor-scoped BUSINESS records (workorders, invoices, BOM, inventory,
 * appointments, etc.) still live in src/lib/sample-data/* in-memory
 * arrays, not Prisma, so there's nothing there to delete yet — once those
 * migrate too, add their deleteMany() calls here alongside vendor.
 */
export async function clearAllVendorData(): Promise<{ ok: true; deletedVendors: number }> {
  const deletedVendors = await deleteAllVendors();
  revalidatePath("/", "layout");
  return { ok: true, deletedVendors };
}
