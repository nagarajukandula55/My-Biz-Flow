"use server";

import { redirect } from "next/navigation";
import { createVendor } from "@/lib/vendorData";
import { createSignupRequest } from "@/lib/vendorSignupRequestsData";
import { getVendorType } from "@/lib/designer/vendorTypesData";

/**
 * Real "register your business" action. No password is collected here —
 * one is generated and shown once on the success page (see /signup/success
 * and /signup/pending), matching the forced-change-on-first-login flow.
 * If the chosen Vendor Type has requiresApproval on, this creates a
 * VendorSignupRequest (no VND#### id yet) instead of a Vendor directly.
 */
export async function registerBusiness(formData: FormData) {
  const vendorTypeId = String(formData.get("vendorTypeId") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const gstin = String(formData.get("gstin") ?? "").trim();
  const businessEmail = String(formData.get("businessEmail") ?? "").trim();
  const businessContact = String(formData.get("businessContact") ?? "").trim();
  const loginContact = String(formData.get("loginContact") ?? "").trim();

  if (!vendorTypeId || !businessName || !city || !state || !pincode || !businessEmail || !businessContact || !loginContact) {
    throw new Error("Missing required signup fields");
  }

  const vendorType = await getVendorType(vendorTypeId);
  const input = { vendorTypeId, businessName, addressLine, city, state, pincode, gstin, businessEmail, businessContact, loginContact };

  if (vendorType?.requiresApproval) {
    let password: string;
    try {
      ({ password } = await createSignupRequest(input));
    } catch {
      redirect(`/signup?type=${encodeURIComponent(vendorTypeId)}&error=contact_taken`);
    }
    redirect(`/signup/pending?businessName=${encodeURIComponent(businessName)}`);
  }

  let vendorId: string;
  let password: string;
  try {
    const result = await createVendor(input);
    vendorId = result.vendor.id;
    password = result.password;
  } catch {
    redirect(`/signup?type=${encodeURIComponent(vendorTypeId)}&error=contact_taken`);
  }

  redirect(`/signup/success?vendorId=${encodeURIComponent(vendorId)}&password=${encodeURIComponent(password)}`);
}
