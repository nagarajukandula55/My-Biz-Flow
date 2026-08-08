"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, updateBusinessRecord, deleteBusinessRecord } from "@/lib/businessRecords";

/** Bind with .bind(null, vendorId, moduleSlug) before passing as a RecordForm `action` prop. */
export async function createBusinessRecordAction(
  vendorId: string,
  moduleSlug: string,
  values: Record<string, unknown>
) {
  const record = await createBusinessRecord(vendorId, moduleSlug, values);
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
