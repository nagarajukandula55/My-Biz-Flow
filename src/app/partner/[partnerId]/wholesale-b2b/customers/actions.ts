"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createWholesaleCustomer,
  getWholesaleCustomer,
  rupeesToPaise,
  updateWholesaleCustomer,
} from "@/lib/wholesaleData";

function parseValues(values: Record<string, unknown>) {
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." } as const;
  return {
    name,
    contact: String(values["contact"] ?? "").trim(),
    gstin: String(values["gstin"] ?? "").trim(),
    creditLimit: rupeesToPaise(Number(values["creditLimit"]) || 0),
    creditTermDays: Number(values["creditTermDays"]) || 0,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  } as const;
}

export async function createWholesaleCustomerAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  const customer = await createWholesaleCustomer(partnerId, parsed);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/customers`);
  redirect(`/partner/${partnerId}/wholesale-b2b/customers/${customer.id}`);
}

export async function updateWholesaleCustomerAction(
  partnerId: string,
  recordId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const existing = await getWholesaleCustomer(partnerId, recordId);
  if (!existing) return { error: "Customer not found." };

  const parsed = parseValues(values);
  if ("error" in parsed) return { error: parsed.error };

  await updateWholesaleCustomer(partnerId, recordId, parsed);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/customers`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/customers/${recordId}`);
  redirect(`/partner/${partnerId}/wholesale-b2b/customers/${recordId}?updated=1`);
}
