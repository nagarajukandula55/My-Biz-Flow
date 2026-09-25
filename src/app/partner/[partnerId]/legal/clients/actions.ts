"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createLegalClient, updateLegalClient } from "@/lib/legal";

export async function createLegalClientAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Client name is required." };

  const client = await createLegalClient(partnerId, {
    name,
    contact: values["contact"] ? String(values["contact"]) : undefined,
    email: values["email"] ? String(values["email"]) : undefined,
    address: values["address"] ? String(values["address"]) : undefined,
  });

  revalidatePath(`/partner/${partnerId}/legal/clients`);
  redirect(`/partner/${partnerId}/legal/clients/${client.id}?created=1`);
}

export async function updateLegalClientAction(partnerId: string, clientId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Client name is required." };

  await updateLegalClient(partnerId, clientId, {
    name,
    contact: values["contact"] ? String(values["contact"]) : undefined,
    email: values["email"] ? String(values["email"]) : undefined,
    address: values["address"] ? String(values["address"]) : undefined,
  });

  revalidatePath(`/partner/${partnerId}/legal/clients`);
  revalidatePath(`/partner/${partnerId}/legal/clients/${clientId}`);
  redirect(`/partner/${partnerId}/legal/clients/${clientId}?updated=1`);
}
