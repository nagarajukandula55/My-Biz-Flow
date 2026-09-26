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
import { assertPartnerScope } from "@/lib/tenant";

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

export async function listProperties(partnerId: string): Promise<PropertyRow[]> {
  return prisma.property.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getProperty(partnerId: string, id: string): Promise<PropertyRow | null> {
  const row = await prisma.property.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createProperty(partnerId: string, input: PropertyInput): Promise<PropertyRow> {
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
export const LEAD_STAGES: LeadStage[] = ["New", "Site Visit Scheduled", "Negotiation", "Agreement Signed", "Closed/Lost"];

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
  const rows = await prisma.enquiry.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { address: true } } },
  });
  return rows.map(toEnquiryRow);
}

export async function getEnquiry(partnerId: string, id: string): Promise<EnquiryRow | null> {
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
  const existing = await prisma.enquiry.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  const row = await prisma.enquiry.update({
    where: { id },
    data: patch,
    include: { property: { select: { address: true } } },
  });
  return toEnquiryRow(row);
}
