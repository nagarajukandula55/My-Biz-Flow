"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { onboardProvider, setProviderStatus, type ServiceAreaInput } from "@/lib/fieldForce/providersData";
import { createService, setServiceActive, updateServicePricing } from "@/lib/fieldForce/servicesData";
import { allocateProvider, updateAllocationStatus } from "@/lib/fieldForce/allocationsData";
import { findOrCreateCustomer, addAddress } from "@/lib/fieldForce/customersData";
import {
  createBooking,
  updateBookingDetails,
  updateBookingStatus,
  rateBooking,
  setFinalPrice,
  assignProviderToBooking,
  type BookingStatus,
} from "@/lib/fieldForce/bookingsData";
import { dispatchBookingRequest, respondToOffer } from "@/lib/fieldForce/matchingEngine";
import { setFieldForceSettings } from "@/lib/fieldForce/settingsData";
import { setPlatformFeeConfig } from "@/lib/fieldForce/platformFeeData";
import { createCustomerAccount, verifyCustomerLogin, CUSTOMER_SESSION_COOKIE } from "@/lib/fieldForce/customerAuth";
import { verifyProviderLogin, PROVIDER_SESSION_COOKIE } from "@/lib/fieldForce/providerAuth";
import { markRead } from "@/lib/fieldForce/notifications";

export async function onboardProviderAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const skillLevel = String(formData.get("skillLevel") ?? "skilled") as "unskilled" | "skilled";
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);

  const areasRaw = String(formData.get("serviceAreas") ?? "[]");
  let serviceAreas: ServiceAreaInput[] = [];
  try {
    serviceAreas = JSON.parse(areasRaw);
  } catch {
    serviceAreas = [];
  }

  if (!name || !phone) throw new Error("Name and phone are required");
  if (!pincode) throw new Error("Pincode is required");
  if (serviceIds.length === 0) throw new Error("Select at least one service");

  await onboardProvider({ partnerId, name, phone, email, source, pincode, skillLevel, serviceIds, serviceAreas });
  revalidatePath(`/partner/${partnerId}/field-force`);
  redirect(`/partner/${partnerId}/field-force`);
}

export async function setProviderStatusAction(partnerId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "pending" | "active" | "suspended";
  await setProviderStatus(id, partnerId, status);
  revalidatePath(`/partner/${partnerId}/field-force`);
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function createServiceAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const priceType = String(formData.get("priceType") ?? "fixed") as "fixed" | "hourly";
  const basePrice = Math.round(Number(formData.get("basePrice") ?? 0) * 100);
  const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
  const minSkillLevel = String(formData.get("minSkillLevel") ?? "skilled") as "unskilled" | "skilled";
  const description = String(formData.get("description") ?? "").trim();
  if (!name || !category) throw new Error("Service name and category are required");
  await createService({ name, category, priceType, basePrice, durationMinutes, minSkillLevel, description });
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function setServiceActiveAction(partnerId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  await setServiceActive(id, isActive);
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function updateServicePricingAction(partnerId: string, formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const priceType = String(formData.get("priceType") ?? "fixed") as "fixed" | "hourly";
  const basePrice = Math.round(Number(formData.get("basePrice") ?? 0) * 100);
  const durationMinutes = Number(formData.get("durationMinutes") ?? 60);
  const minSkillLevel = String(formData.get("minSkillLevel") ?? "skilled") as "unskilled" | "skilled";
  const description = String(formData.get("description") ?? "").trim();
  if (!id) throw new Error("Service id is required");
  await updateServicePricing(id, { priceType, basePrice, durationMinutes, minSkillLevel, description });
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function updateFieldForceSettingsAction(partnerId: string, formData: FormData) {
  await setFieldForceSettings(partnerId, {
    customerSignupEnabled: formData.get("customerSignupEnabled") === "true",
    providerSignupEnabled: formData.get("providerSignupEnabled") === "true",
  });
  revalidatePath(`/partner/${partnerId}/field-force/admin`);
}

export async function allocateProviderAction(partnerId: string, formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  if (!bookingId || !providerId) throw new Error("Booking and provider are required");
  await allocateProvider(partnerId, bookingId, providerId);
  revalidatePath(`/partner/${partnerId}/field-force/allocations`);
  revalidatePath(`/partner/${partnerId}/field-force/bookings`);
  revalidatePath(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
}

export async function updateAllocationStatusAction(partnerId: string, formData: FormData) {
  const allocationId = String(formData.get("allocationId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  await updateAllocationStatus(allocationId, partnerId, status);
  revalidatePath(`/partner/${partnerId}/field-force/allocations`);
  revalidatePath(`/partner/${partnerId}/field-force/bookings`);
}

/** Creates the customer (or reuses an existing one by phone) + a new address, then the Booking itself, then dispatches it. */
export async function createBookingAction(partnerId: string, formData: FormData) {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim();
  const landmark = String(formData.get("landmark") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "");
  const scheduledDate = String(formData.get("scheduledDate") ?? "");
  const slotLabel = String(formData.get("slotLabel") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerName || !customerPhone) throw new Error("Customer name and phone are required");
  if (!line1 || !city || !state || !pincode) throw new Error("Full address is required");
  if (!serviceId) throw new Error("Select a service");
  if (!scheduledDate || !slotLabel) throw new Error("Choose a date and time slot");

  const customer = await findOrCreateCustomer(partnerId, { name: customerName, phone: customerPhone, email: customerEmail });
  const address = await addAddress(customer.id, partnerId, { line1, line2, landmark, city, state, pincode, isDefault: true });
  const booking = await createBooking(partnerId, {
    customerId: customer.id,
    addressId: address.id,
    serviceId,
    scheduledAt: new Date(scheduledDate),
    slotLabel,
    notes,
  });
  await dispatchBookingRequest(booking.id);

  revalidatePath(`/partner/${partnerId}/field-force/bookings`);
  redirect(`/partner/${partnerId}/field-force/bookings/${booking.id}`);
}

export async function updateBookingDetailsAction(partnerId: string, bookingId: string, formData: FormData) {
  const scheduledDate = String(formData.get("scheduledDate") ?? "");
  const slotLabel = String(formData.get("slotLabel") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  await updateBookingDetails(bookingId, partnerId, {
    scheduledAt: scheduledDate ? new Date(scheduledDate) : undefined,
    slotLabel: slotLabel || undefined,
    notes,
  });
  revalidatePath(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
  redirect(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
}

export async function updateBookingStatusAction(partnerId: string, formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;
  await updateBookingStatus(bookingId, partnerId, status);
  revalidatePath(`/partner/${partnerId}/field-force/bookings`);
  revalidatePath(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
}

export async function assignProviderAction(partnerId: string, formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const providerId = String(formData.get("providerId") ?? "");
  if (!bookingId || !providerId) throw new Error("Booking and provider are required");
  await assignProviderToBooking(bookingId, partnerId, providerId);
  revalidatePath(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
}

export async function setFinalPriceAction(partnerId: string, formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const amount = Math.round(Number(formData.get("amount") ?? 0) * 100);
  await setFinalPrice(bookingId, partnerId, amount);
  revalidatePath(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
}

export async function rateBookingAction(partnerId: string, formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  const ratingValue = Number(formData.get("ratingValue") ?? 0);
  const ratingComment = String(formData.get("ratingComment") ?? "").trim();
  await rateBooking(bookingId, partnerId, ratingValue, ratingComment);
  revalidatePath(`/partner/${partnerId}/field-force/bookings/${bookingId}`);
}

// --- Customer self-serve auth ---

export async function signupCustomerAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !phone || !password) throw new Error("Name, phone, and password are required");

  const customer = await createCustomerAccount(partnerId, { name, phone, email, password });
  cookies().set(CUSTOMER_SESSION_COOKIE, customer.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/partner/${partnerId}/field-force/customer/book`);
}

export async function loginCustomerAction(partnerId: string, formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const customer = await verifyCustomerLogin(partnerId, phone, password);
  if (!customer) redirect(`/partner/${partnerId}/field-force/customer/login?error=1`);

  cookies().set(CUSTOMER_SESSION_COOKIE, customer.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/partner/${partnerId}/field-force/customer/bookings`);
}

export async function logoutCustomerAction(partnerId: string) {
  cookies().delete(CUSTOMER_SESSION_COOKIE);
  redirect(`/partner/${partnerId}/field-force/customer/login`);
}

/** The customer's own self-service booking creation — identity comes from the session, not a typed-in name/phone. */
export async function createCustomerBookingAction(partnerId: string, customerId: string, formData: FormData) {
  const line1 = String(formData.get("line1") ?? "").trim();
  const line2 = String(formData.get("line2") ?? "").trim();
  const landmark = String(formData.get("landmark") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "");
  const scheduledDate = String(formData.get("scheduledDate") ?? "");
  const slotLabel = String(formData.get("slotLabel") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!line1 || !city || !state || !pincode) throw new Error("Full address is required");
  if (!serviceId) throw new Error("Select a service");
  if (!scheduledDate || !slotLabel) throw new Error("Choose a date and time slot");

  const address = await addAddress(customerId, partnerId, { line1, line2, landmark, city, state, pincode, isDefault: true });
  const booking = await createBooking(partnerId, {
    customerId,
    addressId: address.id,
    serviceId,
    scheduledAt: new Date(scheduledDate),
    slotLabel,
    notes,
  });
  await dispatchBookingRequest(booking.id);

  redirect(`/partner/${partnerId}/field-force/customer/bookings/${booking.id}`);
}

// --- Provider self-serve auth ---

export async function signupProviderAction(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const pincode = String(formData.get("pincode") ?? "").trim();
  const skillLevel = String(formData.get("skillLevel") ?? "skilled") as "unskilled" | "skilled";
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);

  if (!name || !phone || !password) throw new Error("Name, phone, and password are required");
  if (!pincode) throw new Error("Pincode is required");
  if (serviceIds.length === 0) throw new Error("Select at least one service");

  const provider = await onboardProvider({ partnerId, name, phone, email, pincode, skillLevel, serviceIds, serviceAreas: [], password });
  cookies().set(PROVIDER_SESSION_COOKIE, provider.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/partner/${partnerId}/field-force/provider/dashboard`);
}

export async function loginProviderAction(partnerId: string, formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const provider = await verifyProviderLogin(partnerId, phone, password);
  if (!provider) redirect(`/partner/${partnerId}/field-force/provider/login?error=1`);

  cookies().set(PROVIDER_SESSION_COOKIE, provider.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect(`/partner/${partnerId}/field-force/provider/dashboard`);
}

export async function logoutProviderAction(partnerId: string) {
  cookies().delete(PROVIDER_SESSION_COOKIE);
  redirect(`/partner/${partnerId}/field-force/provider/login`);
}

/** A logged-in Provider onboards a team member under them — no password required at creation time. */
export async function addTeamMemberAction(partnerId: string, teamLeadId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const skillLevel = String(formData.get("skillLevel") ?? "skilled") as "unskilled" | "skilled";
  const serviceIds = formData.getAll("serviceIds").map(String).filter(Boolean);

  if (!name || !phone) throw new Error("Name and phone are required");
  if (!pincode) throw new Error("Pincode is required");
  if (serviceIds.length === 0) throw new Error("Select at least one service");

  await onboardProvider({ partnerId, name, phone, pincode, skillLevel, serviceIds, serviceAreas: [], teamLeadId });
  revalidatePath(`/partner/${partnerId}/field-force/provider/dashboard`);
}

export async function respondToOfferAction(partnerId: string, providerId: string, formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "");
  const response = String(formData.get("response") ?? "") as "accepted" | "declined";
  await respondToOffer(offerId, providerId, response);
  revalidatePath(`/partner/${partnerId}/field-force/provider/dashboard`);
}

export async function markNotificationReadAction(id: string) {
  await markRead(id);
}

// --- Platform-level commission config (Super Admin, global) ---

export async function updatePlatformFeeConfigAction(formData: FormData) {
  const feeType = String(formData.get("feeType") ?? "percent") as "percent" | "flat";
  const rawValue = Number(formData.get("feeValue") ?? 0);
  await setPlatformFeeConfig({
    feeType,
    feeValue: feeType === "flat" ? Math.round(rawValue * 100) : rawValue,
    chargeParty: String(formData.get("chargeParty") ?? "customer") as "customer" | "provider" | "both",
    providerSharePercent: Number(formData.get("providerSharePercent") ?? 50),
    isActive: formData.get("isActive") === "true",
  });
  revalidatePath("/admin/field-force-fee");
}
