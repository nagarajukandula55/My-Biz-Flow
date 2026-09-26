"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAmcContract, updateAmcContract } from "@/lib/amcContractsData";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

/** Bind with .bind(null, partnerId) before passing as a RecordForm/RecordFormModal `action` prop. */
export async function createAmcContractAction(partnerId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  const contract = await createAmcContract(partnerId, {
    customer: String(values["customer"] ?? ""),
    equipment: String(values["equipment"] ?? ""),
    contractStartDate: new Date(String(values["contractStartDate"])),
    contractEndDate: new Date(String(values["contractEndDate"])),
    renewalTermMonths: values["renewalTermMonths"] ? Number(values["renewalTermMonths"]) : undefined,
    slaHours: values["slaHours"] ? Number(values["slaHours"]) : undefined,
    contractValue: values["contractValue"] ? Number(values["contractValue"]) : undefined,
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service`);
  // ?created=1 is read by RecordDetail to render a real "created" ack on arrival.
  redirect(`/partner/${partnerId}/amc-field-service/${contract.id}?created=1`);
}

/** Bind with .bind(null, partnerId, contractId) before passing as a RecordForm `action` prop. */
export async function updateAmcContractAction(partnerId: string, contractId: string, values: Record<string, unknown>) {
  partnerId = await requireSessionPartnerId(partnerId);
  await updateAmcContract(partnerId, contractId, {
    customer: String(values["customer"] ?? ""),
    equipment: String(values["equipment"] ?? ""),
    contractStartDate: new Date(String(values["contractStartDate"])),
    contractEndDate: new Date(String(values["contractEndDate"])),
    renewalTermMonths: values["renewalTermMonths"] ? Number(values["renewalTermMonths"]) : undefined,
    slaHours: values["slaHours"] ? Number(values["slaHours"]) : undefined,
    contractValue: values["contractValue"] ? Number(values["contractValue"]) : undefined,
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service`);
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
  redirect(`/partner/${partnerId}/amc-field-service/${contractId}?updated=1`);
}
