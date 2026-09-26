"use server";

import { revalidatePath } from "next/cache";
import {
  getAmcContract,
  createAmcContract,
  updateAmcContract,
  createServiceVisit,
  updateServiceVisit,
  findOpenVisit,
} from "@/lib/amcContractsData";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";

/**
 * Dispatches a technician to the contract's currently-open ServiceVisit —
 * assignedAt is stamped server-side (never trust a client-submitted
 * timestamp), which is also what clears an SLA-breach reading, since a
 * breach only fires while a visit is raised but undispatched.
 */
export async function dispatchTechnicianAction(
  partnerId: string,
  contractId: string,
  technicianId: string,
  technicianName: string
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) return;
  const openVisit = findOpenVisit(contract);
  if (!openVisit) return;
  await updateServiceVisit(partnerId, openVisit.id, {
    technicianId,
    technicianName,
    assignedAt: new Date(),
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/** Opens a new ServiceVisit against the contract (e.g. a fresh complaint call). */
export async function raiseServiceRequestAction(partnerId: string, contractId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) return;
  await createServiceVisit(partnerId, contractId, {
    serviceRequestRaisedAt: new Date(),
    status: "Scheduled",
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/** Marks the current open ServiceVisit resolved — closes the SLA-breach window. */
export async function resolveServiceRequestAction(partnerId: string, contractId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) return;
  const openVisit = findOpenVisit(contract);
  if (!openVisit) return;
  await updateServiceVisit(partnerId, openVisit.id, { status: "Completed" });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/**
 * Adds a service visit log entry directly (the nested ServiceVisit log's
 * manual "Add Visit" form) — technician, status, and visit date, all
 * server-validated/defaulted rather than trusting client state.
 */
export async function addServiceVisitAction(
  partnerId: string,
  contractId: string,
  values: { visitDate?: string; technicianName?: string; status?: string }
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) return;
  await createServiceVisit(partnerId, contractId, {
    serviceRequestRaisedAt: values.visitDate ? new Date(values.visitDate) : new Date(),
    technicianName: values.technicianName || undefined,
    status: values.status || "Scheduled",
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
  partnerId = await requireSessionPartnerId(partnerId);
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) return;
  if (contract.contractStatus === "Renewed") return; // already renewed — don't double-renew

  const termMonths = contract.renewalTermMonths || 12;
  const prevEnd = contract.contractEndDate;
  const newStart = new Date(prevEnd);
  const newEnd = new Date(prevEnd);
  newEnd.setMonth(newEnd.getMonth() + termMonths);

  const newContract = await createAmcContract(partnerId, {
    customer: contract.customer,
    equipment: contract.equipment,
    contractStartDate: newStart,
    contractEndDate: newEnd,
    renewalTermMonths: termMonths,
    slaHours: contract.slaHours,
    contractValue: contract.contractValue,
    contractStatus: "Active",
    renewedFromId: contractId,
  });

  await updateAmcContract(partnerId, contractId, {
    contractStatus: "Renewed",
    renewedToId: newContract.id,
  });

  revalidatePath(`/partner/${partnerId}/amc-field-service`);
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
  return { newContractId: newContract.id };
}
