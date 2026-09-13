"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, deleteBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { notifyCentralApiBillingInvoice } from "@/lib/centralApi";

/** Bind with .bind(null, partnerId, moduleSlug) before passing as a RecordForm `action` prop. */
export async function createBusinessRecordAction(
  partnerId: string,
  moduleSlug: string,
  values: Record<string, unknown>
) {
  const record = await createBusinessRecord(partnerId, moduleSlug, values);

  if (moduleSlug === "billing") {
    const partner = await getPartner(partnerId);
    if (partner) {
      const items = Array.isArray(record["items"]) ? (record["items"] as Record<string, unknown>[]) : [];
      const customerContactId = record["customerContactId"] ? String(record["customerContactId"]) : undefined;
      const customerContact = customerContactId
        ? await getBusinessRecord(partnerId, "billing-contacts", customerContactId)
        : undefined;
      await notifyCentralApiBillingInvoice(partner, {
        externalOrderId: String(record.id),
        customer: String(record["customer"] ?? ""),
        customerGstin: record["customerGstin"] ? String(record["customerGstin"]) : undefined,
        customerState: customerContact?.["state"] ? String(customerContact["state"]) : undefined,
        items: items.map((it) => ({
          description: String(it["description"] ?? ""),
          quantity: Number(it["quantity"] ?? 0),
          unitPrice: Number(it["unitPrice"] ?? 0),
          taxRate: Number(it["taxRate"] ?? 0),
        })),
        totalAmount: Number(record["totalAmount"] ?? 0),
      });
    }
  }

  revalidatePath(`/partner/${partnerId}/${moduleSlug}`);
  redirect(`/partner/${partnerId}/${moduleSlug}/${record.id}`);
}

/** Bind with .bind(null, partnerId, moduleSlug, recordKey) before passing as a RecordForm `action` prop. */
export async function updateBusinessRecordAction(
  partnerId: string,
  moduleSlug: string,
  recordKey: string,
  values: Record<string, unknown>
) {
  await updateBusinessRecord(partnerId, moduleSlug, recordKey, values);
  revalidatePath(`/partner/${partnerId}/${moduleSlug}`);
  revalidatePath(`/partner/${partnerId}/${moduleSlug}/${recordKey}`);
  redirect(`/partner/${partnerId}/${moduleSlug}/${recordKey}`);
}

/** Bind with .bind(null, partnerId, moduleSlug, recordKey) before calling from a delete confirm handler. */
export async function deleteBusinessRecordAction(partnerId: string, moduleSlug: string, recordKey: string) {
  await deleteBusinessRecord(partnerId, moduleSlug, recordKey);
  revalidatePath(`/partner/${partnerId}/${moduleSlug}`);
  redirect(`/partner/${partnerId}/${moduleSlug}`);
}

/**
 * Merges a partial patch into an existing record's data and persists —
 * does NOT redirect (unlike the other actions here), since it's called
 * repeatedly from an already-loaded page (the Service Centre workorder
 * lifecycle's stage/parts/service-line mutations) that manages its own
 * local state and just needs writes to survive a reload. Bind with
 * .bind(null, partnerId, moduleSlug, recordKey).
 */
export async function patchBusinessRecordAction(
  partnerId: string,
  moduleSlug: string,
  recordKey: string,
  patch: Record<string, unknown>
): Promise<void> {
  const existing = await getBusinessRecord(partnerId, moduleSlug, recordKey);
  if (!existing) return;
  await updateBusinessRecord(partnerId, moduleSlug, recordKey, { ...existing, ...patch });
  revalidatePath(`/partner/${partnerId}/${moduleSlug}/${recordKey}`);
}
