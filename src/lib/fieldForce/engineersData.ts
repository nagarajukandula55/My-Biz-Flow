/**
 * Field Force engineers — recruited by the platform itself, not scoped to
 * any one partner (see prisma/schema.prisma's Engineer model header). Only
 * JobAllocation is partner-scoped, on the brand/job side.
 */
import { prisma } from "@/lib/prisma";

export type ServiceAreaInput = {
  state: string;
  district?: string;
  locality?: string;
  pincode?: string;
};

export type EngineerRecord = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  status: string;
  createdAt: Date;
  services: { id: string; name: string; category: string }[];
  serviceAreas: ServiceAreaInput[];
};

function toRecord(row: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  status: string;
  createdAt: Date;
  services: { service: { id: string; name: string; category: string } }[];
  serviceAreas: { state: string; district: string | null; locality: string | null; pincode: string | null }[];
}): EngineerRecord {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    status: row.status,
    createdAt: row.createdAt,
    services: row.services.map((s) => s.service),
    serviceAreas: row.serviceAreas.map((a) => ({
      state: a.state,
      district: a.district ?? undefined,
      locality: a.locality ?? undefined,
      pincode: a.pincode ?? undefined,
    })),
  };
}

const INCLUDE = {
  services: { include: { service: true } },
  serviceAreas: true,
} as const;

export async function listEngineers(): Promise<EngineerRecord[]> {
  const rows = await prisma.engineer.findMany({ include: INCLUDE, orderBy: { createdAt: "desc" } });
  return rows.map(toRecord);
}

export async function getEngineer(id: string): Promise<EngineerRecord | undefined> {
  const row = await prisma.engineer.findUnique({ where: { id }, include: INCLUDE });
  return row ? toRecord(row) : undefined;
}

/**
 * Onboards a new engineer. `serviceIds` — as many as apply, no cap.
 * `serviceAreas` — as many rows as the engineer adds, each independently
 * EITHER a state/district/locality combination OR a single pincode.
 */
export async function onboardEngineer(input: {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  serviceIds: string[];
  serviceAreas: ServiceAreaInput[];
}): Promise<EngineerRecord> {
  const row = await prisma.engineer.create({
    data: {
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      services: { create: input.serviceIds.map((serviceId) => ({ serviceId })) },
      serviceAreas: {
        create: input.serviceAreas.map((a) => ({
          state: a.state,
          district: a.district || null,
          locality: a.locality || null,
          pincode: a.pincode || null,
        })),
      },
    },
    include: INCLUDE,
  });
  return toRecord(row);
}

export async function setEngineerStatus(id: string, status: "pending" | "active" | "suspended"): Promise<void> {
  await prisma.engineer.update({ where: { id }, data: { status } });
}
