"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  updatePartnerBusinessProfile,
  updatePartnerConfig,
  updatePartnerBusinessDetails,
  updatePartnerLogo,
  updatePartnerServiceArea,
} from "@/lib/partnerData";
import { requestAccessKey } from "@/lib/designer/accessKeys";

/**
 * Settings' top "Business Details" block (Business Name/Address/GSTIN/
 * Timezone/Currency) — used to be a non-persisting demo stub; this is its
 * real Server Action, wired through RecordForm's `action` prop (which calls
 * it with a plain values object, not FormData — see RecordForm.tsx).
 */
export async function saveBusinessDetailsAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);

  const businessName = String(values.businessName ?? "").trim();
  if (!businessName) return { error: "Business Name is required" };

  await updatePartnerBusinessDetails(partnerId, {
    businessName,
    address: String(values.address ?? ""),
    gstin: String(values.gstin ?? ""),
    timezone: String(values.timezone ?? "Asia/Kolkata"),
    currency: String(values.currency ?? "INR"),
  });

  revalidatePath(`/partner/${partnerId}/settings`);
  redirect(`/partner/${partnerId}/settings?saved=1`);
}

/**
 * Settings > Service Centre's "Service area" block — which service types
 * (Onsite/Walk-in) this partner offers and which pincodes they cover.
 * Drives the public Book Appointment form's auto-assignment (see
 * src/lib/serviceCentreInquiryAssignment.ts).
 */
export async function saveServiceAreaAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  const pincodesText = String(formData.get("pincodesText") ?? "");
  const pincodes = Array.from(
    new Set(
      pincodesText
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter((p) => /^\d{6}$/.test(p))
    )
  );

  await updatePartnerServiceArea(partnerId, {
    serviceTypes: formData.getAll("serviceTypes").map((v) => String(v)),
    pincodes,
  });

  revalidatePath(`/partner/${partnerId}/settings`);
  redirect(`/partner/${partnerId}/settings?saved=1#settings-panel-service-centre`);
}

/**
 * Logo upload — called directly from the client component (not through a
 * <form action>, since the data: URL is produced client-side via
 * FileReader) with the already-encoded data: URL string. See
 * updatePartnerLogo() for the size/format guardrails.
 */
export async function saveLogoAction(partnerId: string, dataUrl: string | null): Promise<{ error?: string } | void> {
  await requireSessionPartnerId(partnerId);
  try {
    await updatePartnerLogo(partnerId, dataUrl);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save logo" };
  }
  revalidatePath(`/partner/${partnerId}/settings`);
  revalidatePath(`/partner/${partnerId}`, "layout");
}

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
  // ?saved=1 — GlobalActionBanner (rendered from AppShell) turns this into a
  // real "Saved." acknowledgment instead of a silent inline re-render.
  redirect(`/partner/${partnerId}/settings?saved=1`);
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
  redirect(`/partner/${partnerId}/settings?saved=1`);
}

/**
 * A partner can no longer self-enable a module directly — this only
 * records a pending request (ModuleAccessKey.status = "requested") for a
 * Super Admin to approve/deny from /admin/access-keys (see
 * requestAccessKey in src/lib/designer/accessKeys.ts). Nothing becomes
 * reachable to this partner until that approval happens.
 */
export async function requestModuleAccessAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);

  const moduleSlug = String(formData.get("moduleSlug") ?? "").trim();
  if (!moduleSlug) throw new Error("Module is required");

  await requestAccessKey(partnerId, moduleSlug, "Requested by partner from Settings");

  revalidatePath(`/partner/${partnerId}/settings`);
  redirect(`/partner/${partnerId}/settings?saved=1`);
}
