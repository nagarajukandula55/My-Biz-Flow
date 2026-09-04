/**
 * Job allocations — an engineer assigned to a partner's (brand's) job
 * requirement. Partner-scoped on the job side (assertPartnerScope applies
 * to partnerId here), even though Engineer itself is platform-wide.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";

export type JobAllocationRecord = {
  id: string;
  engineerId: string;
  engineerName: string;
  partnerId: string;
  jobRef: string;
  status: string;
  assignedAt: Date;
  feeAmount: number | null;
  feeStatus: string | null;
};

export async function listAllocationsForPartner(partnerId: string): Promise<JobAllocationRecord[]> {
  const rows = await prisma.jobAllocation.findMany({
    where: { partnerId },
    include: { engineer: true },
    orderBy: { assignedAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    engineerId: r.engineerId,
    engineerName: r.engineer.name,
    partnerId: r.partnerId,
    jobRef: r.jobRef,
    status: r.status,
    assignedAt: r.assignedAt,
    feeAmount: r.feeAmount,
    feeStatus: r.feeStatus,
  }));
}

/**
 * Creates the allocation. No fee/charge is set here — we charge partners
 * nothing today; feeAmount/feeStatus stay null until a future billing
 * pass turns that on (schema already carries the fields, see
 * prisma/schema.prisma's JobAllocation model).
 */
export async function allocateEngineer(partnerId: string, jobRef: string, engineerId: string): Promise<void> {
  await prisma.jobAllocation.create({ data: { partnerId, jobRef, engineerId } });
}

export async function updateAllocationStatus(
  allocationId: string,
  partnerId: string,
  status: "assigned" | "in-progress" | "done" | "cancelled"
): Promise<void> {
  const existing = await prisma.jobAllocation.findUniqueOrThrow({ where: { id: allocationId } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.jobAllocation.update({ where: { id: allocationId }, data: { status } });
}
