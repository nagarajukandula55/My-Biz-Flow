"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, isValidAdminCookie } from "@/lib/adminAuth";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";
import { documentBelongsToWorkspace } from "@/lib/workspaceProfiles";
import {
  saveMainScheme,
  savePartnerScheme,
  clearPartnerScheme,
  getNextNumber,
  type NumberingScheme,
} from "@/lib/designer/numbering";

async function requireNumberingAccess(documentType: string, partnerId?: string): Promise<void> {
  if (await isValidAdminCookie(cookies().get(ADMIN_COOKIE_NAME)?.value)) return;
  if (!partnerId) throw new Error("Administrator access required");
  await requireSessionPartnerId(partnerId);
  const modules = await getVisibleModuleSlugs(partnerId);
  // Keep the established Service Centre numbering choices for its authenticated owner.
  if (!modules.includes("service-centre") && !documentBelongsToWorkspace(documentType, modules)) {
    throw new Error("Document numbering is not available for your active modules");
  }
}

/** Editing the platform-wide Main scheme is a Super Admin action (now lives in My Biz Flow Admin) -- kept here only because NumberingSchemeEditor is one shared component for both Main and per-partner editing; nothing in this app currently renders it without a partnerId, so this path is unreachable here. */
export async function saveMainSchemeAction(documentType: string, scheme: NumberingScheme) {
  await requireNumberingAccess(documentType);
  await saveMainScheme(documentType, scheme);
  revalidatePath("/admin/numbering");
}

export async function savePartnerSchemeAction(partnerId: string, documentType: string, scheme: NumberingScheme) {
  await requireNumberingAccess(documentType, partnerId);
  await savePartnerScheme(partnerId, documentType, scheme);
  revalidatePath(`/partner/${partnerId}/settings/numbering`);
}

export async function clearPartnerSchemeAction(partnerId: string, documentType: string) {
  await requireNumberingAccess(documentType, partnerId);
  await clearPartnerScheme(partnerId, documentType);
  revalidatePath(`/partner/${partnerId}/settings/numbering`);
}

/** Real increment — see src/lib/designer/numbering.ts's header for why this is "live," not mocked. */
export async function fetchNextNumberAction(documentType: string, partnerId?: string) {
  await requireNumberingAccess(documentType, partnerId);
  return getNextNumber(documentType, partnerId);
}
