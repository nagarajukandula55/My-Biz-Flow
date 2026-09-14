"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { updatePartnerBusinessProfile } from "@/lib/partnerData";

/** Real, persisted save — distinct from SettingsPageClient's demo-stub form above it on the same page. */
export async function saveBusinessProfileAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  await updatePartnerBusinessProfile(partnerId, {
    contactPerson: String(formData.get("contactPerson") ?? ""),
    pan: String(formData.get("pan") ?? ""),
    businessCategory: String(formData.get("businessCategory") ?? ""),
    serviceTerms: String(formData.get("serviceTerms") ?? ""),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    supportHotline: String(formData.get("supportHotline") ?? ""),
    bankAccountName: String(formData.get("bankAccountName") ?? ""),
    bankName: String(formData.get("bankName") ?? ""),
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
    bankIfsc: String(formData.get("bankIfsc") ?? ""),
  });

  revalidatePath(`/partner/${partnerId}/settings`);
}
