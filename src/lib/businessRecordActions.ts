"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, deleteBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import { getVendor } from "@/lib/vendorData";
import { notifyCentralApiBillingInvoice } from "@/lib/centralApi";

/** Bind with .bind(null, vendorId, moduleSlug) before passing as a RecordForm `action` prop. */
export async function createBusinessRecordAction(
  vendorId: string,
  moduleSlug: string,
  values: Record<string, unknown>
) {
  const record = await createBusinessRecord(vendorId, moduleSlug, values);

  if (moduleSlug === "billing") {
    const vendor = await getVendor(vendorId);
    if (vendor) {
      const items = Array.isArray(record["items"]) ? (record["items"] as Record<string, unknown>[]) : [];
      await notifyCentralApiBillingInvoice(vendor, {
        externalOrderId: String(record.id),
        customer: String(record["customer"] ?? ""),
        customerGstin: record["customerGstin"] ? String(record["customerGstin"]) : undefined,
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

  revalidatePath(`/vendor/${vendorId}/${moduleSlug}`);
  redirect(`/vendor/${vendorId}/${moduleSlug}/${record.id}`);
}

/** Bind with .bind(null, vendorId, moduleSlug, recordKey) before passing as a RecordForm `action` prop. */
export async function updateBusinessRecordAction(
  vendorId: string,
  moduleSlug: string,
  recordKey: string,
  values: Record<string, unknown>
) {
  await updateBusinessRecord(vendorId, moduleSlug, recordKey, values);
  revalidatePath(`/vendor/${vendorId}/${moduleSlug}`);
  revalidatePath(`/vendor/${vendorId}/${moduleSlug}/${recordKey}`);
  redirect(`/vendor/${vendorId}/${moduleSlug}/${recordKey}`);
}

/** Bind with .bind(null, vendorId, moduleSlug, recordKey) before calling from a delete confirm handler. */
export async function deleteBusinessRecordAction(vendorId: string, moduleSlug: string, recordKey: string) {
  await deleteBusinessRecord(vendorId, moduleSlug, recordKey);
  revalidatePath(`/vendor/${vendorId}/${moduleSlug}`);
  redirect(`/vendor/${vendorId}/${moduleSlug}`);
}

/**
 * Merges a partial patch into an existing record's data and persists —
 * does NOT redirect (unlike the other actions here), since it's called
 * repeatedly from an already-loaded page (the Service Centre workorder
 * lifecycle's stage/parts/service-line mutations) that manages its own
 * local state and just needs writes to survive a reload. Bind with
 * .bind(null, vendorId, moduleSlug, recordKey).
 */
export async function patchBusinessRecordAction(
  vendorId: string,
  moduleSlug: string,
  recordKey: string,
  patch: Record<string, unknown>
): Promise<void> {
  const existing = await getBusinessRecord(vendorId, moduleSlug, recordKey);
  if (!existing) return;
  await updateBusinessRecord(vendorId, moduleSlug, recordKey, { ...existing, ...patch });
  revalidatePath(`/vendor/${vendorId}/${moduleSlug}/${recordKey}`);
}
