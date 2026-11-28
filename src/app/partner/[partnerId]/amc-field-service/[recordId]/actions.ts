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
import { withRecordLock } from "@/lib/withRecordLock";
import { getBusinessRecord } from "@/lib/businessRecords";

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
  const technician = await getBusinessRecord(partnerId, "users", technicianId);
  if (!technician || technician["status"] !== "Active" || technician["role"] !== "Technician") {
    throw new Error("Select an active technician for this business.");
  }
  if (technicianName.trim() !== technicianId) throw new Error("Technician selection has changed. Refresh and retry.");
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) return;
  const openVisit = findOpenVisit(contract);
  if (!openVisit) return;
  if (contract.contractStatus !== "Active") throw new Error("Only active contracts can dispatch service visits.");
  await updateServiceVisit(partnerId, openVisit.id, {
    technicianId,
    technicianName: technicianId,
    assignedAt: new Date(),
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/** Opens a new ServiceVisit against the contract (e.g. a fresh complaint call). */
export async function raiseServiceRequestAction(partnerId: string, contractId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await withRecordLock("amc-contract", `${partnerId}:${contractId}`, async () => {
    const contract = await getAmcContract(partnerId, contractId);
    if (!contract) throw new Error("Contract not found.");
    if (contract.contractStatus !== "Active") throw new Error("Only active contracts can accept service requests.");
    if (findOpenVisit(contract)) throw new Error("Resolve the open service request before raising another.");
    await createServiceVisit(partnerId, contractId, {
      serviceRequestRaisedAt: new Date(), status: "Scheduled",
    });
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
  if (contract.contractStatus !== "Active") throw new Error("Only active contracts can resolve service visits.");
  await updateServiceVisit(partnerId, openVisit.id, { status: "Completed" });
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
}

/** Records a technician's device check-in location on the open AMC visit. */
export async function checkInServiceVisitAction(partnerId: string, contractId: string, latitude: number, longitude: number): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("A valid device location is required.");
  const contract = await getAmcContract(partnerId, contractId); if (!contract) return;
  const openVisit = findOpenVisit(contract); if (!openVisit) return;
  if (contract.contractStatus !== "Active" || !openVisit.technicianId) throw new Error("Dispatch a technician on an active contract before check-in.");
  await updateServiceVisit(partnerId, openVisit.id, { checkInLatitude: latitude, checkInLongitude: longitude, status: "Checked in" });
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
  if (values.visitDate && !Number.isFinite(new Date(values.visitDate).getTime())) throw new Error("Select a valid visit date.");
  if (values.status && !["Scheduled", "Technician en route", "Checked in", "Completed", "Overdue"].includes(values.status)) throw new Error("Select a valid visit status.");
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
  const result = await withRecordLock("amc-contract", `${partnerId}:${contractId}`, async () => {
  const contract = await getAmcContract(partnerId, contractId);
  if (!contract) throw new Error("Contract not found.");
  if (contract.contractStatus === "Renewed") return contract.renewedToId ? { newContractId: contract.renewedToId } : undefined;
  if (contract.contractStatus !== "Active" && contract.contractStatus !== "Expired") throw new Error("This contract cannot be renewed.");

  const termMonths = contract.renewalTermMonths || 12;
  const prevEnd = contract.contractEndDate;
  const newStart = new Date(prevEnd);
  const newEnd = new Date(prevEnd);
  newEnd.setUTCDate(1);
  newEnd.setUTCMonth(newEnd.getUTCMonth() + termMonths);
  newEnd.setUTCDate(Math.min(prevEnd.getUTCDate(), new Date(Date.UTC(newEnd.getUTCFullYear(), newEnd.getUTCMonth() + 1, 0)).getUTCDate()));

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

  return { newContractId: newContract.id };
  });
  revalidatePath(`/partner/${partnerId}/amc-field-service`);
  revalidatePath(`/partner/${partnerId}/amc-field-service/${contractId}`);
  return result;
}
