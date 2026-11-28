/**
 * Prisma-backed data-access layer for the Brand module's real tables
 * (Brand, Location — see prisma/schema.prisma, "2026-09-25, second pass";
 * already migrated, see CLAUDE.md's database-safety rules — this file
 * never mutates the schema). Replaces the old BusinessRecord-backed
 * brand.ts sample data (still present at src/lib/sample-data/brand.ts for
 * its column/field vocabulary and detail/rollup helpers, now operating on
 * these real rows instead of a flat BusinessRecord list).
 *
 * Money (`monthlyRevenue`) is paise (int), matching every other real-money
 * column in this schema — converted to rupees at this layer's edge, same
 * convention as wholesaleData.ts.
 *
 * Location.partnerId is the location's OWN partner (a Brand's sibling
 * locations can belong to different partners), distinct from
 * Brand.partnerId (the brand-account owner) — see the Prisma schema's
 * doc comment on Location. This module only ever creates/lists Locations
 * scoped to the signed-in partner, so in practice every Location this UI
 * creates has partnerId === the Brand's own partnerId; the schema still
 * allows the general case for future cross-partner brand rollups.
 *
 * `mappedWarehouseId` stays a loose string — it stores the SELECTED
 * warehouse's display name (matching brand.ts's pre-existing convention
 * and getWarehouseOptionsForPartner's {value,label} shape where value ==
 * label), not a foreign key to any warehouse table (there isn't one; see
 * src/lib/sample-data/warehouse.ts's own doc comments).
 */
import { prisma } from "@/lib/prisma";
import { assertPartnerCanWrite, assertPartnerScope } from "@/lib/tenant";
import { assertRecordModuleAccess } from "@/lib/recordEntitlement";

async function readAccess(partnerId: string) { await assertRecordModuleAccess(partnerId, "brand"); }
async function writeAccess(partnerId: string) { await readAccess(partnerId); await assertPartnerCanWrite(partnerId); }

async function requireOwnedBrand(partnerId: string, brandId: string): Promise<BrandRow> {
  const brand = await getBrand(partnerId, brandId);
  if (!brand) throw new Error("Brand not found for this business.");
  return brand;
}

export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((Number(rupees) || 0) * 100);
}

/* ------------------------------------------------------------------ *
 * Brand
 * ------------------------------------------------------------------ */

export type BrandRow = {
  id: string;
  partnerId: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
};

export async function listBrands(partnerId: string): Promise<BrandRow[]> {
  await readAccess(partnerId);
  return prisma.brand.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
}

export async function getBrand(partnerId: string, id: string): Promise<BrandRow | null> {
  await readAccess(partnerId);
  const row = await prisma.brand.findUnique({ where: { id } });
  if (!row) return null;
  assertPartnerScope(partnerId, row.partnerId);
  return row;
}

export async function createBrand(
  partnerId: string,
  input: { name: string; isActive: boolean }
): Promise<BrandRow> {
  await writeAccess(partnerId);
  if (!input.name.trim()) throw new Error("Brand name is required.");
  return prisma.brand.create({
    data: { partnerId, name: input.name.trim(), isActive: input.isActive },
  });
}

export async function updateBrand(
  partnerId: string,
  id: string,
  input: { name: string; isActive: boolean }
): Promise<void> {
  await writeAccess(partnerId);
  if (!input.name.trim()) throw new Error("Brand name is required.");
  const existing = await prisma.brand.findUniqueOrThrow({ where: { id } });
  assertPartnerScope(partnerId, existing.partnerId);
  await prisma.brand.update({
    where: { id },
    data: { name: input.name.trim(), isActive: input.isActive },
  });
}

/* ------------------------------------------------------------------ *
 * Location
 * ------------------------------------------------------------------ */

export type LocationRow = {
  id: string;
  brandId: string;
  partnerId: string;
  locationName: string;
  city: string;
  modulesEnabled: string | null;
  mappedWarehouseId: string | null;
  monthlyRevenue: number; // paise
  status: string;
  openedDate: Date | null;
  createdAt: Date;
};

export async function listLocationsForBrand(partnerId: string, brandId: string): Promise<LocationRow[]> {
  // Confirms the Brand itself belongs to this partner before listing its
  // locations — a Location's own partnerId can differ (see file header),
  // so this is the real scope check for "can this session see this
  // brand's locations" rather than filtering rows by partnerId directly.
  await requireOwnedBrand(partnerId, brandId);
  return prisma.location.findMany({ where: { brandId }, orderBy: { createdAt: "desc" } });
}

/** Every Location across every Brand this partner owns — for the rollup and the flat "all locations" list. */
export async function listLocationsForPartnerBrands(partnerId: string): Promise<LocationRow[]> {
  await readAccess(partnerId);
  return prisma.location.findMany({
    where: { brand: { partnerId } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLocation(partnerId: string, brandId: string, id: string): Promise<LocationRow | null> {
  await requireOwnedBrand(partnerId, brandId);
  const row = await prisma.location.findUnique({ where: { id } });
  if (!row || row.brandId !== brandId) return null;
  return row;
}

export type LocationInput = {
  locationName: string;
  city: string;
  modulesEnabled?: string;
  mappedWarehouseId?: string;
  monthlyRevenue: number; // paise
  status: string;
  openedDate?: Date | null;
};

function validateLocation(input: LocationInput) {
  if (!input.locationName.trim() || !input.city.trim()) throw new Error("Location name and city are required.");
  if (!Number.isSafeInteger(input.monthlyRevenue) || input.monthlyRevenue < 0) throw new Error("Monthly revenue must be a non-negative amount in paise.");
  if (!input.status.trim()) throw new Error("Location status is required.");
  if (input.openedDate && !Number.isFinite(input.openedDate.getTime())) throw new Error("Select a valid opening date.");
}

export async function createLocation(partnerId: string, brandId: string, input: LocationInput): Promise<LocationRow> {
  await writeAccess(partnerId);
  validateLocation(input);
  await requireOwnedBrand(partnerId, brandId);
  return prisma.location.create({
    data: {
      brandId,
      partnerId,
      locationName: input.locationName,
      city: input.city,
      modulesEnabled: input.modulesEnabled || null,
      mappedWarehouseId: input.mappedWarehouseId || null,
      monthlyRevenue: input.monthlyRevenue,
      status: input.status,
      openedDate: input.openedDate ?? null,
    },
  });
}

export async function updateLocation(
  partnerId: string,
  brandId: string,
  id: string,
  input: LocationInput
): Promise<void> {
  await writeAccess(partnerId);
  validateLocation(input);
  await requireOwnedBrand(partnerId, brandId);
  const existing = await prisma.location.findUniqueOrThrow({ where: { id } });
  if (existing.brandId !== brandId) {
    throw new Error(`Location "${id}" does not belong to brand "${brandId}".`);
  }
  await prisma.location.update({
    where: { id },
    data: {
      locationName: input.locationName,
      city: input.city,
      modulesEnabled: input.modulesEnabled || null,
      mappedWarehouseId: input.mappedWarehouseId || null,
      monthlyRevenue: input.monthlyRevenue,
      status: input.status,
      openedDate: input.openedDate ?? null,
    },
  });
}

/* ------------------------------------------------------------------ *
 * Rollup — aggregates a Brand's own Locations (replaces brand.ts's old
 * computeBrandRollup, which grouped a flat BusinessRecord list by
 * brandName; now every Location already carries a real brandId).
 * ------------------------------------------------------------------ */

export interface BrandRollup {
  locationCount: number;
  totalMonthlyRevenue: number; // rupees
  statusBreakdown: Record<string, number>;
}

export function computeBrandRollup(locations: LocationRow[]): BrandRollup {
  const statusBreakdown: Record<string, number> = {};
  for (const l of locations) {
    statusBreakdown[l.status] = (statusBreakdown[l.status] ?? 0) + 1;
  }
  return {
    locationCount: locations.length,
    totalMonthlyRevenue: locations.reduce((sum, l) => sum + paiseToRupees(l.monthlyRevenue), 0),
    statusBreakdown,
  };
}
