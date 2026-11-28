/**
 * Prisma-backed data-access layer for the Real Estate module's real tables
 * (Property, Enquiry — see prisma/schema.prisma; already migrated, see
 * CLAUDE.md's database-safety rules — this file never mutates the schema).
 *
 * Money fields (Property.price, Enquiry.dealValue/commissionAmount) are
 * paise (int), matching every other real-money column in this schema — the
 * shared UI components' "currency" type formats a raw number as rupees with
 * no conversion of their own, so every Row/RecordField/FormFieldDef built
 * from these models converts paise -> rupees for display and rupees ->
 * paise on write, right at this layer's edge (same convention as
 * src/lib/wholesaleData.ts).
 *
 * Enquiry has no lead name/contact columns in the migrated schema (see the
 * model's own doc comment in prisma/schema.prisma: "lead pipeline: stage/
 * agent/site-visit window/deal value/commission/closed-lost reason" only)
 * — an enquiry is identified by its id, its linked Property, and its
 * pipeline stage, not by a free-typed enquirer name.
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";

async function readAccess(partnerId: string) { await assertRecordModuleAccess(partnerId, "real-estate"); }
async function writeAccess(partnerId: string) { await readAccess(partnerId); await assertPartnerCanWrite(partnerId); }

export function paiseToRupees(paise: number | null | undefined): number {
  if (paise === null || paise === undefined) return 0;
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((Number(rupees) || 0) * 100);
}

/* ------------------------------------------------------------------ *
 * Property
 * ------------------------------------------------------------------ */

export type PropertyRow = {
  id: string;
  partnerId: string;
  propertyType: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price: number; // paise
  areaSqft: number | null;
  bedrooms: number | null;
  listingStatus: string;
  agentName: string | null;
  siteVisitDate: Date | null;
  createdAt: Date;
};

export type PropertyInput = {
  propertyType: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  price: number; // paise
  areaSqft?: number | null;
  bedrooms?: number | null;
  listingStatus: string;
  agentName?: string | null;
  siteVisitDate?: Date | null;
};

function validateProperty(input: PropertyInput) {
  if (!input.propertyType.trim() || !input.address.trim()) throw new Error("Property type and address are required.");
  if (!Number.isSafeInteger(input.price) || input.price < 0) throw new Error("Property price must be a non-negative amount in paise.");
  if (input.areaSqft != null && (!Number.isFinite(input.areaSqft) || input.areaSqft <= 0)) throw new Error("Enter a valid property area.");
  if (input.bedrooms != null && (!Number.isSafeInteger(input.bedrooms) || input.bedrooms < 0)) throw new Error("Enter a valid bedroom count.");
  if (input.latitude != null && (!Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90)) throw new Error("Invalid latitude.");
  if (input.longitude != null && (!Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180)) throw new Error("Invalid longitude.");
  if (input.siteVisitDate && !Number.isFinite(input.siteVisitDate.getTime())) throw new Error("Invalid site visit date.");
}

export async function listProperties(partnerId: string): Promise<PropertyRow[]> {
  await readAccess(partnerId);
  return prisma.property.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getProperty(partnerId: string, id: string): Promise<PropertyRow | null> {
  await readAccess(partnerId);
  const row = await prisma.property.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createProperty(partnerId: string, input: PropertyInput): Promise<PropertyRow> {
  await writeAccess(partnerId);
  validateProperty(input);
  return prisma.property.create({
    data: {
      partnerId,
      propertyType: input.propertyType,
      address: input.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      price: input.price,
      areaSqft: input.areaSqft ?? null,
      bedrooms: input.bedrooms ?? null,
      listingStatus: input.listingStatus,
      agentName: input.agentName || null,
      siteVisitDate: input.siteVisitDate ?? null,
    },
  });
}

export async function updateProperty(partnerId: string, id: string, input: PropertyInput): Promise<void> {
  await writeAccess(partnerId);
  validateProperty(input);
  const existing = await prisma.property.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.property.update({
    where: { id },
    data: {
      propertyType: input.propertyType,
      address: input.address,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      price: input.price,
      areaSqft: input.areaSqft ?? null,
      bedrooms: input.bedrooms ?? null,
      listingStatus: input.listingStatus,
      agentName: input.agentName || null,
      siteVisitDate: input.siteVisitDate ?? null,
    },
  });
}

/* ------------------------------------------------------------------ *
 * Enquiry
 * ------------------------------------------------------------------ */

export type LeadStage = "New" | "Site Visit Scheduled" | "Negotiation" | "Agreement Signed" | "Closed/Lost";
import { LEAD_STAGES } from "@/lib/realEstateStages";
export { LEAD_STAGES } from "@/lib/realEstateStages";

export type EnquiryRow = {
  id: string;
  partnerId: string;
  propertyId: string | null;
  propertyAddress: string | null; // denormalized for display only
  stage: LeadStage;
  agentName: string | null;
  siteVisitStart: Date | null;
  siteVisitEnd: Date | null;
  dealValue: number | null; // paise
  commissionPct: number | null;
  commissionAmount: number | null; // paise
  closedLostReason: string | null;
  createdAt: Date;
};

function toEnquiryRow(row: {
  id: string;
  partnerId: string;
  propertyId: string | null;
  property: { address: string } | null;
  stage: string;
  agentName: string | null;
  siteVisitStart: Date | null;
  siteVisitEnd: Date | null;
  dealValue: number | null;
  commissionPct: number | null;
  commissionAmount: number | null;
  closedLostReason: string | null;
  createdAt: Date;
}): EnquiryRow {
  return {
    id: row.id,
    partnerId: row.partnerId,
    propertyId: row.propertyId,
    propertyAddress: row.property?.address ?? null,
    stage: (row.stage as LeadStage) ?? "New",
    agentName: row.agentName,
    siteVisitStart: row.siteVisitStart,
    siteVisitEnd: row.siteVisitEnd,
    dealValue: row.dealValue,
    commissionPct: row.commissionPct,
    commissionAmount: row.commissionAmount,
    closedLostReason: row.closedLostReason,
    createdAt: row.createdAt,
  };
}

export async function listEnquiries(partnerId: string): Promise<EnquiryRow[]> {
  await readAccess(partnerId);
  const rows = await prisma.enquiry.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { address: true } } },
  });
  return rows.map(toEnquiryRow);
}

export async function getEnquiry(partnerId: string, id: string): Promise<EnquiryRow | null> {
  await readAccess(partnerId);
  const row = await prisma.enquiry.findUnique({
    where: { id },
    include: { property: { select: { address: true } } },
  });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return toEnquiryRow(row);
}

export async function createEnquiry(
  partnerId: string,
  input: { propertyId?: string | null; agentName?: string | null; stage?: LeadStage }
): Promise<EnquiryRow> {
  await writeAccess(partnerId);
  if (input.stage && !LEAD_STAGES.includes(input.stage)) throw new Error("Select a valid enquiry stage.");
  if (input.propertyId && !(await getProperty(partnerId, input.propertyId))) throw new Error("Property not found for this business.");
  const row = await prisma.enquiry.create({
    data: {
      partnerId,
      propertyId: input.propertyId || null,
      agentName: input.agentName || null,
      stage: input.stage ?? "New",
    },
    include: { property: { select: { address: true } } },
  });
  return toEnquiryRow(row);
}

export async function updateEnquiry(
  partnerId: string,
  id: string,
  input: { propertyId?: string | null; agentName?: string | null; stage?: LeadStage }
): Promise<void> {
  await writeAccess(partnerId);
  if (input.stage && !LEAD_STAGES.includes(input.stage)) throw new Error("Select a valid enquiry stage.");
  if (input.propertyId && !(await getProperty(partnerId, input.propertyId))) throw new Error("Property not found for this business.");
  const existing = await prisma.enquiry.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.enquiry.update({
    where: { id },
    data: {
      propertyId: input.propertyId === undefined ? undefined : input.propertyId || null,
      agentName: input.agentName === undefined ? undefined : input.agentName || null,
      stage: input.stage,
    },
  });
}

/**
 * Patches lifecycle-only fields on an enquiry (stage advance, site-visit
 * scheduling, agreement/commission, closed-lost reason) — used by the
 * lifecycle server actions, kept separate from updateEnquiry (the plain
 * edit-form path) since it never touches propertyId.
 */
export async function patchEnquiryLifecycle(
  partnerId: string,
  id: string,
  patch: {
    stage?: LeadStage;
    agentName?: string;
    siteVisitStart?: Date | null;
    siteVisitEnd?: Date | null;
    dealValue?: number | null;
    commissionPct?: number | null;
    commissionAmount?: number | null;
    closedLostReason?: string;
  }
): Promise<EnquiryRow> {
  await writeAccess(partnerId);
  if (patch.stage && !LEAD_STAGES.includes(patch.stage)) throw new Error("Select a valid enquiry stage.");
  if (patch.siteVisitStart !== undefined || patch.siteVisitEnd !== undefined) {
    const bothCleared = patch.siteVisitStart === null && patch.siteVisitEnd === null;
    if (!bothCleared && (!patch.siteVisitStart || !patch.siteVisitEnd || !Number.isFinite(patch.siteVisitStart.getTime()) ||
        !Number.isFinite(patch.siteVisitEnd.getTime()) || patch.siteVisitEnd <= patch.siteVisitStart)) {
      throw new Error("Select a valid site visit start and end time.");
    }
  }
  if (patch.dealValue != null && (!Number.isSafeInteger(patch.dealValue) || patch.dealValue < 0)) throw new Error("Invalid deal value.");
  if (patch.commissionPct != null && (!Number.isFinite(patch.commissionPct) || patch.commissionPct < 0 || patch.commissionPct > 100)) throw new Error("Commission must be between 0 and 100 percent.");
  if (patch.commissionAmount != null && (!Number.isSafeInteger(patch.commissionAmount) || patch.commissionAmount < 0)) throw new Error("Invalid commission amount.");
  const existing = await prisma.enquiry.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  const row = await prisma.enquiry.update({
    where: { id },
    data: patch,
    include: { property: { select: { address: true } } },
  });
  return toEnquiryRow(row);
}
