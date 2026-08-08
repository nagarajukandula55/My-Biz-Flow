"use server";

import { redirect } from "next/navigation";
import { createVendor } from "@/lib/vendorData";

/**
 * Real "register your business" action — creates a Vendor row (Prisma),
 * assigns the next sequential VND#### id, and sends the vendor to /login
 * with that id shown once so they can note it down. Vendor Type is
 * required (the vendor only ever sees the type's name at signup, per
 * CLAUDE.md — no modules/roles/plans exposed here).
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
  const password = String(formData.get("password") ?? "");

  if (!vendorTypeId || !businessName || !city || !state || !pincode || !businessEmail || !businessContact || !loginContact || !password) {
    throw new Error("Missing required signup fields");
  }

  let vendorId: string;
  try {
    const vendor = await createVendor({
      vendorTypeId,
      businessName,
      addressLine,
      city,
      state,
      pincode,
      gstin,
      businessEmail,
      businessContact,
      loginContact,
      password,
    });
    vendorId = vendor.id;
  } catch {
    redirect(`/signup?type=${encodeURIComponent(vendorTypeId)}&error=contact_taken`);
  }

  redirect(`/login?welcomeVendorId=${encodeURIComponent(vendorId)}`);
}
