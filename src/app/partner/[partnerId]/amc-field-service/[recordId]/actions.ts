"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";

/**
 * Dispatches a technician to a contract's currently-open service request —
 * assignedAt is stamped server-side (never trust a client-submitted
 * timestamp), which is also what clears an SLA-breach reading, since a
 * breach only fires while a request is raised but undispatched.
 */
export async function dispatchTechnicianAction(
  partnerId: string,
  contractId: string,
  technicianId: string,
  technicianName: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "amc-field-service", contractId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "amc-field-service", contractId, {
    ...record,
    technicianId,
    technicianName,
    assignedAt: new Date().toISOString(),
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/** Opens a new service request against the contract (e.g. a fresh complaint call) — clears any prior dispatch. */
export async function raiseServiceRequestAction(partnerId: string, contractId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "amc-field-service", contractId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "amc-field-service", contractId, {
    ...record,
    serviceRequestRaisedAt: new Date().toISOString(),
    technicianId: undefined,
    technicianName: undefined,
    assignedAt: undefined,
    status: "Scheduled",
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/** Marks the current open service request resolved — closes the SLA-breach window. */
export async function resolveServiceRequestAction(partnerId: string, contractId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "amc-field-service", contractId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "amc-field-service", contractId, {
    ...record,
    serviceRequestRaisedAt: undefined,
    status: "Completed",
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/**
 * Creates a next-term contract copying key fields forward from this one and
 * shifting contractStartDate/contractEndDate by the contract's own
 * renewalTermMonths, then marks this contract Renewed (a terminal,
 * non-Active state distinct from Expired — this contract was actively
 * rolled forward rather than lapsing unrenewed). All dates are computed
 * server-side from the existing contractEndDate, never client-submitted.
 */
export async function renewContractAction(partnerId: string, contractId: string): Promise<{ newContractId: string } | void> {
  const record = await getBusinessRecord(partnerId, "amc-field-service", contractId);
  if (!record) return;
  if (record["contractStatus"] === "Renewed") return; // already renewed — don't double-renew

  const termMonths = Number(record["renewalTermMonths"] ?? 12);
  const prevEnd = record["contractEndDate"] ? new Date(String(record["contractEndDate"])) : new Date();
  const newStart = new Date(prevEnd);
  const newEnd = new Date(prevEnd);
  newEnd.setMonth(newEnd.getMonth() + termMonths);

  const newContract = await createBusinessRecord(partnerId, "amc-field-service", {
    customer: record["customer"],
    equipment: record["equipment"],
    contractStartDate: newStart.toISOString().slice(0, 10),
    contractEndDate: newEnd.toISOString().slice(0, 10),
    renewalTermMonths: termMonths,
    slaHours: record["slaHours"],
    contractValue: record["contractValue"],
    status: "Scheduled",
    contractStatus: "Active",
    renewedFromId: contractId,
  });

  await updateBusinessRecord(partnerId, "amc-field-service", contractId, {
    ...record,
    contractStatus: "Renewed",
    renewedToId: newContract.id,
  });

  revalidatePath(`/partner/${partnerId}/amc-field-service`);
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
  return { newContractId: String(newContract.id) };
}
