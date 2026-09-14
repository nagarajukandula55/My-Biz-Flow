"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBusinessRecord, deleteBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { normaliseDefinition, REPORT_DEFINITIONS_MODULE } from "@/lib/reportBuilder";

/**
 * Saves the definition currently shown in the builder as a re-runnable
 * report. The definition arrives as the same JSON the builder round-trips
 * through the URL; normaliseDefinition() re-validates it server-side, so a
 * hand-edited payload can't smuggle in an unknown source or field.
 */
export async function saveReportDefinitionAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);

  const raw = String(formData.get("definition") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const recordKey = String(formData.get("recordKey") ?? "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Could not read the report definition.");
  }

  const definition = normaliseDefinition({ ...(parsed as object), name });
  if (!definition) throw new Error("Pick a data source before saving this report.");

  const values = {
    name: definition.name,
    source: definition.source,
    fields: definition.fields,
    filters: definition.filters,
    savedAt: new Date().toISOString(),
  };

  let id = recordKey;
  if (recordKey) {
    await updateBusinessRecord(partnerId, REPORT_DEFINITIONS_MODULE, recordKey, values);
  } else {
    const record = await createBusinessRecord(partnerId, REPORT_DEFINITIONS_MODULE, values);
    id = String(record.id);
  }

  revalidatePath(`/partner/${partnerId}/service-centre/reports`);
  redirect(`/partner/${partnerId}/service-centre/reports/${id}`);
}

export async function deleteReportDefinitionAction(partnerId: string, recordKey: string) {
  await requireSessionPartnerId(partnerId);
  await deleteBusinessRecord(partnerId, REPORT_DEFINITIONS_MODULE, recordKey);
  revalidatePath(`/partner/${partnerId}/service-centre/reports`);
  redirect(`/partner/${partnerId}/service-centre/reports`);
}
