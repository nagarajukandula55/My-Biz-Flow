"use server";

import { revalidatePath } from "next/cache";
import {
  saveMainScheme,
  saveVendorScheme,
  clearVendorScheme,
  getNextNumber,
  type NumberingScheme,
} from "@/lib/designer/numbering";

export async function saveMainSchemeAction(documentType: string, scheme: NumberingScheme) {
  saveMainScheme(documentType, scheme);
  revalidatePath("/admin/numbering");
}

export async function saveVendorSchemeAction(vendorId: string, documentType: string, scheme: NumberingScheme) {
  saveVendorScheme(vendorId, documentType, scheme);
  revalidatePath(`/vendor/${vendorId}/settings/numbering`);
}

export async function clearVendorSchemeAction(vendorId: string, documentType: string) {
  clearVendorScheme(vendorId, documentType);
  revalidatePath(`/vendor/${vendorId}/settings/numbering`);
}

/** Real increment — see src/lib/designer/numbering.ts's header for why this is "live," not mocked. */
export async function fetchNextNumberAction(documentType: string, vendorId?: string) {
  return getNextNumber(documentType, vendorId);
}
