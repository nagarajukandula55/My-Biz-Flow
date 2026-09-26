"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createProperty, getProperty, updateProperty, rupeesToPaise, type PropertyInput } from "@/lib/realEstateData";

function parseValues(values: Record<string, unknown>): PropertyInput | { error: string } {
  const propertyType = String(values["propertyType"] ?? "").trim();
  const address = String(values["address"] ?? "").trim();
  const price = Number(values["price"]);
  const listingStatus = String(values["listingStatus"] ?? "").trim() || "Available";
  if (!propertyType) return { error: "Property Type is required." };
  if (!address) return { error: "Address is required." };
  if (!price || price <= 0) return { error: "Price is required." };

  return {
    propertyType,
    address,
    latitude: values["latitude"] !== undefined && values["latitude"] !== "" ? Number(values["latitude"]) : null,
    longitude: values["longitude"] !== undefined && values["longitude"] !== "" ? Number(values["longitude"]) : null,
    price: rupeesToPaise(price),
    areaSqft: values["areaSqft"] !== undefined && values["areaSqft"] !== "" ? Number(values["areaSqft"]) : null,
    bedrooms: values["bedrooms"] !== undefined && values["bedrooms"] !== "" ? Number(values["bedrooms"]) : null,
    listingStatus,
    agentName: String(values["agentName"] ?? "").trim() || null,
    siteVisitDate: values["siteVisitDate"] ? new Date(String(values["siteVisitDate"])) : null,
  };
}

export async function createPropertyAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  const property = await createProperty(partnerId, parsed);
  revalidatePath(`/partner/${partnerId}/real-estate/properties`);
  redirect(`/partner/${partnerId}/real-estate/properties/${property.id}`);
}

export async function updatePropertyAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getProperty(partnerId, recordId);
  if (!existing) return { error: "Property not found." };

  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  await updateProperty(partnerId, recordId, parsed);
  revalidatePath(`/partner/${partnerId}/real-estate/properties`);
  revalidatePath(`/partner/${partnerId}/real-estate/properties/${recordId}`);
  redirect(`/partner/${partnerId}/real-estate/properties/${recordId}?updated=1`);
}
