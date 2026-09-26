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
import { assertPartnerScope } from "@/lib/tenant";

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
  return prisma.amcContract.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
  });
}

/** Same as listAmcContracts but with each contract's serviceVisits (newest first) — for the list page's alert badges. */
export async function listAmcContractsWithVisits(partnerId: string): Promise<AmcContractWithVisits[]> {
  return prisma.amcContract.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { serviceVisits: { orderBy: { createdAt: "desc" } } },
  });
}

/** Includes serviceVisits newest-first — [0] is the current/most-recent visit, if any. */
export async function getAmcContract(partnerId: string, id: string): Promise<AmcContractWithVisits | null> {
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
  const existing = await prisma.amcContract.findUnique({ where: { id } });
  if (!existing) throw new Error(`AmcContract ${id} not found`);
  assertPartnerScope(partnerId, existing.partnerId);
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
  const contract = await prisma.amcContract.findUnique({ where: { id: contractId } });
  if (!contract) throw new Error(`AmcContract ${contractId} not found`);
  assertPartnerScope(partnerId, contract.partnerId);
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
