/**
 * Field Force Providers — partner-scoped workers (skilled or unskilled) who
 * fulfill bookings. A Provider can onboard their own team under them
 * (teamLeadId self-relation); each team member has their own login and
 * independently picks their own services/skill level.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerScope } from "@/lib/tenant";
import { hashPassword } from "@/lib/passwords";

export type ServiceAreaInput = {
  state: string;
  district?: string;
  locality?: string;
  pincode?: string;
};

export type ProviderRecord = {
  id: string;
  partnerId: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  pincode: string;
  skillLevel: string;
  status: string;
  verificationStatus: string;
  verificationNote: string | null;
  verifiedAt: Date | null;
  isAvailable: boolean;
  availabilityNote: string | null;
  hasLogin: boolean;
  preferredLanguage: string;
  teamLeadId: string | null;
  createdAt: Date;
  services: { id: string; name: string; category: string }[];
  serviceAreas: ServiceAreaInput[];
};

function toRecord(row: {
  id: string;
  partnerId: string;
  name: string;
  phone: string;
  email: string | null;
  source: string | null;
  pincode: string;
  skillLevel: string;
  status: string;
  verificationStatus: string;
  verificationNote: string | null;
  verifiedAt: Date | null;
  isAvailable: boolean;
  availabilityNote: string | null;
  passwordHash: string | null;
  preferredLanguage: string;
  teamLeadId: string | null;
  createdAt: Date;
  services: { service: { id: string; name: string; category: string } }[];
  serviceAreas: { state: string; district: string | null; locality: string | null; pincode: string | null }[];
}): ProviderRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    pincode: row.pincode,
    skillLevel: row.skillLevel,
    status: row.status,
    verificationStatus: row.verificationStatus,
    verificationNote: row.verificationNote,
    verifiedAt: row.verifiedAt,
    isAvailable: row.isAvailable,
    availabilityNote: row.availabilityNote,
    hasLogin: !!row.passwordHash,
    preferredLanguage: row.preferredLanguage,
    teamLeadId: row.teamLeadId,
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

export async function listProviders(partnerId: string): Promise<ProviderRecord[]> {
  const rows = await prisma.provider.findMany({ where: { partnerId }, include: INCLUDE, orderBy: { createdAt: "desc" } });
  return rows.map(toRecord);
}

export async function getProvider(id: string, partnerId?: string): Promise<ProviderRecord | undefined> {
  const row = await prisma.provider.findUnique({ where: { id }, include: INCLUDE });
  if (!row) return undefined;
  if (partnerId) assertPartnerScope(partnerId, row.partnerId);
  return toRecord(row);
}

export async function listTeamMembers(leadProviderId: string): Promise<ProviderRecord[]> {
  const rows = await prisma.provider.findMany({ where: { teamLeadId: leadProviderId }, include: INCLUDE, orderBy: { createdAt: "desc" } });
  return rows.map(toRecord);
}

/**
 * Onboards a new Provider (ops-entered or self-signup). `serviceIds` — as
 * many as apply, no cap. `serviceAreas` — extra coverage beyond the
 * mandatory primary `pincode`, each independently EITHER a
 * state/district/locality combination OR a single pincode. `password` is
 * optional — ops onboarding a Provider doesn't need to set one; self-signup
 * always passes one.
 */
export async function onboardProvider(input: {
  partnerId: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  pincode: string;
  skillLevel: "unskilled" | "skilled";
  serviceIds: string[];
  serviceAreas: ServiceAreaInput[];
  password?: string;
  teamLeadId?: string;
}): Promise<ProviderRecord> {
  const selectedServices = await prisma.service.findMany({
    where: { id: { in: input.serviceIds }, isActive: true },
    select: { id: true, minSkillLevel: true },
  });
  if (selectedServices.length !== new Set(input.serviceIds).size) {
    throw new Error("One or more selected services are unavailable.");
  }
  // Classification is derived from the service catalogue, not trusted from
  // the browser: any skilled service makes the provider Skilled; a provider
  // selecting only unskilled services is Unskilled.
  const skillLevel = selectedServices.some((service) => service.minSkillLevel === "skilled") ? "skilled" : "unskilled";
  const row = await prisma.provider.create({
    data: {
      partnerId: input.partnerId,
      name: input.name,
      phone: input.phone,
      email: input.email || null,
      source: input.source || null,
      pincode: input.pincode,
      skillLevel,
      passwordHash: input.password ? hashPassword(input.password) : null,
      teamLeadId: input.teamLeadId || null,
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

export async function setProviderStatus(id: string, partnerId: string, status: "pending" | "active" | "suspended"): Promise<void> {
  const existing = await prisma.provider.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.provider.update({ where: { id }, data: { status } });
}

export async function setProviderAvailability(id: string, partnerId: string, isAvailable: boolean, note?: string): Promise<void> {
  const existing = await prisma.provider.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.provider.update({ where: { id }, data: { isAvailable, availabilityNote: note?.trim() || null } });
}

export async function setProviderVerification(id: string, partnerId: string, status: "unverified" | "pending" | "verified" | "rejected", note?: string): Promise<void> {
  const existing = await prisma.provider.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.provider.update({ where: { id }, data: { verificationStatus: status, verificationNote: note?.trim() || null, verifiedAt: status === "verified" ? new Date() : null } });
}
