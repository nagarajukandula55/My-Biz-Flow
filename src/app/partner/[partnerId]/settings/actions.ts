"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { updatePartnerBusinessProfile, updatePartnerConfig } from "@/lib/partnerData";

/** Real, persisted save — distinct from SettingsPageClient's demo-stub form above it on the same page. */
export async function saveBusinessProfileAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  await updatePartnerBusinessProfile(partnerId, {
    contactPerson: String(formData.get("contactPerson") ?? ""),
    pan: String(formData.get("pan") ?? ""),
    businessCategory: String(formData.get("businessCategory") ?? ""),
    // Checkbox group — unticking everything falls back to ELECTRONICS
    // rather than leaving a partner with no catalog at all.
    productDomains: formData.getAll("productDomains").map((v) => String(v)),
    serviceHours: String(formData.get("serviceHours") ?? ""),
    supportHotline: String(formData.get("supportHotline") ?? ""),
    bankAccountName: String(formData.get("bankAccountName") ?? ""),
    bankName: String(formData.get("bankName") ?? ""),
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
    bankIfsc: String(formData.get("bankIfsc") ?? ""),
  });

  revalidatePath(`/partner/${partnerId}/settings`);
}

/**
 * Settings → Config. Deliberately a separate action from
 * saveBusinessProfileAction: the two are separate forms on the page, and a
 * single shared action would blank whichever form's fields weren't
 * submitted. Terms & Conditions live here (the general fallback plus one
 * override per document type), not on the Business Profile form.
 */
export async function savePartnerConfigAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  await updatePartnerConfig(partnerId, {
    defaultLaborCharge: String(formData.get("defaultLaborCharge") ?? ""),
    upiId: String(formData.get("upiId") ?? ""),
    serviceTerms: String(formData.get("serviceTerms") ?? ""),
    workorderTerms: String(formData.get("workorderTerms") ?? ""),
    estimateTerms: String(formData.get("estimateTerms") ?? ""),
    invoiceTerms: String(formData.get("invoiceTerms") ?? ""),
    serviceRecordTerms: String(formData.get("serviceRecordTerms") ?? ""),
  });

  revalidatePath(`/partner/${partnerId}/settings`);
}
