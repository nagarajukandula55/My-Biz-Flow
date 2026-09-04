"use server";

import { revalidatePath } from "next/cache";
import {
  saveMainScheme,
  savePartnerScheme,
  clearPartnerScheme,
  getNextNumber,
  type NumberingScheme,
} from "@/lib/designer/numbering";

export async function saveMainSchemeAction(documentType: string, scheme: NumberingScheme) {
  await saveMainScheme(documentType, scheme);
  revalidatePath("/admin/numbering");
}

export async function savePartnerSchemeAction(partnerId: string, documentType: string, scheme: NumberingScheme) {
  await savePartnerScheme(partnerId, documentType, scheme);
  revalidatePath(`/partner/${partnerId}/settings/numbering`);
}

export async function clearPartnerSchemeAction(partnerId: string, documentType: string) {
  await clearPartnerScheme(partnerId, documentType);
  revalidatePath(`/partner/${partnerId}/settings/numbering`);
}

/** Real increment — see src/lib/designer/numbering.ts's header for why this is "live," not mocked. */
export async function fetchNextNumberAction(documentType: string, partnerId?: string) {
  return getNextNumber(documentType, partnerId);
}
