"use server";

import { revalidatePath } from "next/cache";
import { setPagePublic } from "@/lib/designer/pageAccess";

export async function setPagePublicAction(pageId: string, isPublic: boolean) {
  await setPagePublic(pageId, isPublic);
  revalidatePath("/admin/settings");
}

/**
 * Deletes every VENDOR and the business data scoped to it — deliberately
 * NEVER platform configuration (Designer customizations, document
 * templates, module appearance, numbering schemes, page-access, error
 * log). That config is the system the Super Admin is building out for
 * every future vendor and must survive a demo-data wipe untouched.
 *
 * Currently a no-op: there is no Vendor model yet, and every vendor's
 * business records (workorders, invoices, BOM, inventory, appointments,
 * etc.) still live in src/lib/sample-data/* in-memory arrays, not Prisma
 * — so there is nothing real to delete yet. Once vendor signup and
 * business records move to Prisma, wire this to
 * `prisma.vendor.deleteMany({})` with `onDelete: Cascade` (or explicit
 * per-table deletes) on every vendor-scoped table — and nothing else.
 */
export async function clearAllVendorData(): Promise<{ ok: true; deletedVendors: number }> {
  return { ok: true, deletedVendors: 0 };
}
