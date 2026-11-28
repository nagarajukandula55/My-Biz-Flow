/**
 * Prisma-backed data access for the amc-field-service module —
 * AmcContract (the annual maintenance contract) + ServiceVisit (the
 * dispatch/visit log against it). Replaces the earlier BusinessRecord-backed
 * version of this module (see prisma/schema.prisma, "2026-09-25, second
 * pass" block, for the model definitions).
 *
 * Tenant-scoped throughout per DESIGN_SYSTEM.md §9 / src/lib/tenant.ts —
 * every read/write here takes partnerId and filters/checks by it.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";

const CONTRACT_STATUSES = ["Active", "Renewed", "Expired"];
const VISIT_STATUSES = ["Scheduled", "Technician en route", "Checked in", "Completed", "Overdue"];
async function readAccess(partnerId: string) { await assertRecordModuleAccess(partnerId, "amc-field-service"); }
async function writeAccess(partnerId: string) { await readAccess(partnerId); await assertPartnerCanWrite(partnerId); }

function validateContract(data: {
  customer?: string; equipment?: string; contractStartDate?: Date; contractEndDate?: Date;
  renewalTermMonths?: number; slaHours?: number; contractValue?: number; contractStatus?: string;
}) {
  if (data.customer !== undefined && !data.customer.trim()) throw new Error("Customer is required.");
  if (data.equipment !== undefined && !data.equipment.trim()) throw new Error("Equipment is required.");
  for (const date of [data.contractStartDate, data.contractEndDate]) {
    if (date && !Number.isFinite(date.getTime())) throw new Error("Select valid contract dates.");
  }
  if (data.contractStartDate && data.contractEndDate && data.contractEndDate <= data.contractStartDate) throw new Error("Contract end must follow its start date.");
  if (data.renewalTermMonths !== undefined && (!Number.isSafeInteger(data.renewalTermMonths) || data.renewalTermMonths < 1)) throw new Error("Renewal term must be a positive number of months.");
  if (data.slaHours !== undefined && (!Number.isSafeInteger(data.slaHours) || data.slaHours < 1)) throw new Error("SLA hours must be positive.");
  if (data.contractValue !== undefined && (!Number.isSafeInteger(data.contractValue) || data.contractValue < 0)) throw new Error("Contract value must be a non-negative amount in paise.");
  if (data.contractStatus !== undefined && !CONTRACT_STATUSES.includes(data.contractStatus)) throw new Error("Select a valid contract status.");
}

function validateVisit(data: { serviceRequestRaisedAt?: Date | null; assignedAt?: Date | null; status?: string; checkInLatitude?: number | null; checkInLongitude?: number | null }) {
  if (data.status && !VISIT_STATUSES.includes(data.status)) throw new Error("Select a valid service visit status.");
  if (data.serviceRequestRaisedAt && !Number.isFinite(data.serviceRequestRaisedAt.getTime())) throw new Error("Select a valid visit date.");
  if (data.assignedAt && !Number.isFinite(data.assignedAt.getTime())) throw new Error("Invalid assignment date.");
  if (data.checkInLatitude != null && (!Number.isFinite(data.checkInLatitude) || Math.abs(data.checkInLatitude) > 90)) throw new Error("Invalid check-in latitude.");
  if (data.checkInLongitude != null && (!Number.isFinite(data.checkInLongitude) || Math.abs(data.checkInLongitude) > 180)) throw new Error("Invalid check-in longitude.");
}

export type AmcContractRecord = {
  id: string;
  partnerId: string;
  customer: string;
  equipment: string;
  contractStartDate: Date;
  contractEndDate: Date;
  renewalTermMonths: number;
  slaHours: number;
  contractValue: number;
  contractStatus: string;
  renewedFromId: string | null;
  renewedToId: string | null;
  createdAt: Date;
};

export type ServiceVisitRecord = {
  id: string;
  contractId: string;
  partnerId: string;
  serviceRequestRaisedAt: Date | null;
  technicianId: string | null;
  technicianName: string | null;
  assignedAt: Date | null;
  status: string;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  createdAt: Date;
};

export type AmcContractWithVisits = AmcContractRecord & { serviceVisits: ServiceVisitRecord[] };

export async function listAmcContracts(partnerId: string): Promise<AmcContractRecord[]> {
  await readAccess(partnerId);
  return prisma.amcContract.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
  });
}

/** Same as listAmcContracts but with each contract's serviceVisits (newest first) — for the list page's alert badges. */
export async function listAmcContractsWithVisits(partnerId: string): Promise<AmcContractWithVisits[]> {
  await readAccess(partnerId);
  return prisma.amcContract.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { serviceVisits: { orderBy: { createdAt: "desc" } } },
  });
}

/** Includes serviceVisits newest-first — [0] is the current/most-recent visit, if any. */
export async function getAmcContract(partnerId: string, id: string): Promise<AmcContractWithVisits | null> {
  await readAccess(partnerId);
  const record = await prisma.amcContract.findUnique({
    where: { id },
    include: { serviceVisits: { orderBy: { createdAt: "desc" } } },
  });
  if (!record) return null;
  assertPartnerScope(partnerId, record.partnerId);
  return record;
}

export async function createAmcContract(
  partnerId: string,
  data: {
    customer: string;
    equipment: string;
    contractStartDate: Date;
    contractEndDate: Date;
    renewalTermMonths?: number;
    slaHours?: number;
    contractValue?: number;
    contractStatus?: string;
    renewedFromId?: string;
  }
): Promise<AmcContractRecord> {
  await writeAccess(partnerId);
  validateContract(data);
  if (!data.customer.trim() || !data.equipment.trim() || !Number.isFinite(data.contractStartDate.getTime()) ||
      !Number.isFinite(data.contractEndDate.getTime())) throw new Error("Customer, equipment, and valid contract dates are required.");
  return prisma.amcContract.create({
    data: {
      partnerId,
      customer: data.customer,
      equipment: data.equipment,
      contractStartDate: data.contractStartDate,
      contractEndDate: data.contractEndDate,
      renewalTermMonths: data.renewalTermMonths ?? 12,
      slaHours: data.slaHours ?? 24,
      contractValue: data.contractValue ?? 0,
      contractStatus: data.contractStatus ?? "Active",
      renewedFromId: data.renewedFromId,
    },
  });
}

export async function updateAmcContract(
  partnerId: string,
  id: string,
  data: Partial<{
    customer: string;
    equipment: string;
    contractStartDate: Date;
    contractEndDate: Date;
    renewalTermMonths: number;
    slaHours: number;
    contractValue: number;
    contractStatus: string;
    renewedFromId: string | null;
    renewedToId: string | null;
  }>
): Promise<AmcContractRecord> {
  await writeAccess(partnerId);
  validateContract(data);
  const existing = await prisma.amcContract.findUnique({ where: { id } });
  if (!existing) throw new Error(`AmcContract ${id} not found`);
  assertPartnerScope(partnerId, existing.partnerId);
  if (data.contractStartDate || data.contractEndDate) validateContract({
    contractStartDate: data.contractStartDate ?? existing.contractStartDate,
    contractEndDate: data.contractEndDate ?? existing.contractEndDate,
  });
  return prisma.amcContract.update({ where: { id }, data });
}

/** The current open visit: the newest ServiceVisit that has a raised request but isn't Completed. Null if none. */
export function findOpenVisit(contract: AmcContractWithVisits): ServiceVisitRecord | null {
  return contract.serviceVisits.find((v) => v.serviceRequestRaisedAt && v.status !== "Completed") ?? null;
}

export async function createServiceVisit(
  partnerId: string,
  contractId: string,
  data: Partial<{
    serviceRequestRaisedAt: Date;
    technicianId: string;
    technicianName: string;
    assignedAt: Date;
    status: string;
    checkInLatitude: number;
    checkInLongitude: number;
  }>
): Promise<ServiceVisitRecord> {
  await writeAccess(partnerId);
  validateVisit(data);
  const contract = await prisma.amcContract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error(`AmcContract ${contractId} not found`);
  assertPartnerScope(partnerId, contract.partnerId);
  if (contract.contractStatus !== "Active") throw new Error("Service visits require an active contract.");
  return prisma.serviceVisit.create({
    data: {
      contractId,
      partnerId,
      serviceRequestRaisedAt: data.serviceRequestRaisedAt,
      technicianId: data.technicianId,
      technicianName: data.technicianName,
      assignedAt: data.assignedAt,
      status: data.status ?? "Scheduled",
      checkInLatitude: data.checkInLatitude,
      checkInLongitude: data.checkInLongitude,
    },
  });
}

export async function updateServiceVisit(
  partnerId: string,
  visitId: string,
  data: Partial<{
    serviceRequestRaisedAt: Date | null;
    technicianId: string | null;
    technicianName: string | null;
    assignedAt: Date | null;
    status: string;
    checkInLatitude: number | null;
    checkInLongitude: number | null;
  }>
): Promise<ServiceVisitRecord> {
  await writeAccess(partnerId);
  validateVisit(data);
  const existing = await prisma.serviceVisit.findUnique({ where: { id: visitId } });
  if (!existing) throw new Error(`ServiceVisit ${visitId} not found`);
  assertPartnerScope(partnerId, existing.partnerId);
  return prisma.serviceVisit.update({ where: { id: visitId }, data });
}

/**
 * Normalized view of a contract + its current open visit, for the badges
 * and the AmcLifecycle panel — mirrors the shape the old BusinessRecord
 * version exposed via extractAmcLifecycleFromRecord.
 */
export type AmcContractLifecycle = {
  contractStatus: string;
  serviceStatus: string;
  slaHours: number;
  contractEndDate?: string;
  renewalTermMonths: number;
  serviceRequestRaisedAt?: string;
  technicianId?: string;
  technicianName?: string;
  assignedAt?: string;
  renewedFromId?: string;
  renewedToId?: string;
};

export function extractAmcLifecycle(contract: AmcContractWithVisits): AmcContractLifecycle {
  const openVisit = findOpenVisit(contract);
  const latestVisit = contract.serviceVisits[0];
  return {
    contractStatus: contract.contractStatus,
    serviceStatus: (openVisit ?? latestVisit)?.status ?? "Scheduled",
    slaHours: contract.slaHours,
    contractEndDate: contract.contractEndDate.toISOString().slice(0, 10),
    renewalTermMonths: contract.renewalTermMonths,
    serviceRequestRaisedAt: openVisit?.serviceRequestRaisedAt?.toISOString(),
    technicianId: openVisit?.technicianId ?? undefined,
    technicianName: openVisit?.technicianName ?? undefined,
    assignedAt: openVisit?.assignedAt?.toISOString() ?? undefined,
    renewedFromId: contract.renewedFromId ?? undefined,
    renewedToId: contract.renewedToId ?? undefined,
  };
}

/**
 * SLA breached: there's an open service request (raised, not yet resolved)
 * that has had no technician dispatched for longer than the contract's SLA
 * response-time window. Always computed against `now` at call time — never
 * persisted, so it can't go stale.
 */
export function computeSlaBreach(lifecycle: AmcContractLifecycle, now: Date = new Date()): boolean {
  if (!lifecycle.serviceRequestRaisedAt || lifecycle.technicianId) return false;
  const raised = new Date(lifecycle.serviceRequestRaisedAt).getTime();
  if (Number.isNaN(raised)) return false;
  const hoursSince = (now.getTime() - raised) / (1000 * 60 * 60);
  return hoursSince > lifecycle.slaHours;
}

/** Renewal due: contract is Active and its end date falls within the next 30 days (or has already passed). */
export function computeRenewalDue(lifecycle: AmcContractLifecycle, now: Date = new Date()): boolean {
  if (lifecycle.contractStatus !== "Active" || !lifecycle.contractEndDate) return false;
  const end = new Date(lifecycle.contractEndDate).getTime();
  if (Number.isNaN(end)) return false;
  const daysUntil = (end - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 30;
}
