/**
 * Data-access layer for the Rentals / Booking module's Prisma-backed
 * tables (RentalAsset, RentalAgreement — see prisma/schema.prisma's
 * "Rentals" block, migration 20260925180000). Replaces the previous
 * BusinessRecord-backed ("rentals" moduleSlug) storage — same conversion
 * pattern this app already used for Clinic (see src/lib/clinic.ts, the
 * reference this file follows: tenant-scoped list/get/create/update, a
 * fail-closed conflict check before a booking-style write, redirect-driven
 * server actions in each route's actions.ts).
 *
 * Relationship modeled: RentalAsset 1--* RentalAgreement (assetId is
 * nullable on RentalAgreement — an agreement can be created before a
 * matching RentalAsset catalog row exists, falling back to a plain
 * assetName text match for double-booking checks, same as the previous
 * BusinessRecord-era extractRentalsLifecycle's own fallback).
 *
 * depositAmount/rentalAmount/damageCharge/refundableAmount are Int paise,
 * matching every other money field in this schema; callers that work in
 * rupees (forms) convert at the boundary.
 */
import { prisma } from "@/lib/prisma";

export type RentalAgreementStatus = "Requested" | "Confirmed" | "Ongoing" | "Completed" | "Cancelled";
export const RENTAL_AGREEMENT_STATUSES: RentalAgreementStatus[] = [
  "Requested",
  "Confirmed",
  "Ongoing",
  "Completed",
  "Cancelled",
];

// --- Assets -----------------------------------------------------------------

export async function listAssets(partnerId: string) {
  return prisma.rentalAsset.findMany({ where: { partnerId }, orderBy: { assetName: "asc" } });
}

export async function listActiveAssets(partnerId: string) {
  return prisma.rentalAsset.findMany({ where: { partnerId, isActive: true }, orderBy: { assetName: "asc" } });
}

export async function getAsset(partnerId: string, id: string) {
  const asset = await prisma.rentalAsset.findUnique({
    where: { id },
    include: { agreements: { orderBy: { bookingStart: "desc" } } },
  });
  if (!asset || asset.partnerId !== partnerId) return null;
  return asset;
}

export async function createAsset(partnerId: string, data: { assetName: string; isActive?: boolean }) {
  return prisma.rentalAsset.create({
    data: {
      partnerId,
      assetName: data.assetName,
      isActive: data.isActive ?? true,
    },
  });
}

export async function updateAsset(partnerId: string, id: string, data: { assetName: string; isActive?: boolean }) {
  const existing = await prisma.rentalAsset.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Asset not found.");
  return prisma.rentalAsset.update({
    where: { id },
    data: {
      assetName: data.assetName,
      isActive: data.isActive ?? existing.isActive,
    },
  });
}

// --- Agreements ---------------------------------------------------------------

export async function listAgreements(partnerId: string) {
  return prisma.rentalAgreement.findMany({
    where: { partnerId },
    orderBy: { bookingStart: "desc" },
    include: { asset: true },
  });
}

export async function getAgreement(partnerId: string, id: string) {
  const agreement = await prisma.rentalAgreement.findUnique({
    where: { id },
    include: { asset: true },
  });
  if (!agreement || agreement.partnerId !== partnerId) return null;
  return agreement;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type AssetConflict = { agreementId: string; renter: string; bookingStart: Date; bookingEnd: Date };

/**
 * Fail-closed double-booking check: does any OTHER non-Cancelled agreement
 * for this partner already book the same asset (matched by assetId when
 * given, else by exact assetName text) over an overlapping date range?
 * Checked server-side before the write, never trusted from the client.
 * `excludeAgreementId` lets an edit/reschedule re-check without flagging
 * itself.
 */
export async function checkAssetConflict(
  partnerId: string,
  assetId: string | undefined,
  assetName: string,
  bookingStart: Date,
  bookingEnd: Date,
  excludeAgreementId?: string
): Promise<AssetConflict | null> {
  if (Number.isNaN(bookingStart.getTime()) || Number.isNaN(bookingEnd.getTime())) return null;

  const candidates = await prisma.rentalAgreement.findMany({
    where: {
      partnerId,
      status: { not: "Cancelled" },
      ...(assetId ? { assetId } : { assetName }),
      ...(excludeAgreementId ? { id: { not: excludeAgreementId } } : {}),
    },
  });

  for (const other of candidates) {
    if (overlaps(bookingStart, bookingEnd, other.bookingStart, other.bookingEnd)) {
      return { agreementId: other.id, renter: other.renter, bookingStart: other.bookingStart, bookingEnd: other.bookingEnd };
    }
  }
  return null;
}

export type CreateAgreementInput = {
  assetId?: string;
  assetName: string;
  renter: string;
  bookingStart: Date;
  bookingEnd: Date;
  depositAmount?: number; // paise
  rentalAmount: number; // paise
  status?: RentalAgreementStatus;
};

export async function createAgreement(
  partnerId: string,
  input: CreateAgreementInput
): Promise<{ ok: true; id: string } | { ok: false; conflict: AssetConflict }> {
  const conflict = await checkAssetConflict(partnerId, input.assetId, input.assetName, input.bookingStart, input.bookingEnd);
  if (conflict) return { ok: false, conflict };

  const agreement = await prisma.rentalAgreement.create({
    data: {
      partnerId,
      assetId: input.assetId || null,
      assetName: input.assetName,
      renter: input.renter,
      bookingStart: input.bookingStart,
      bookingEnd: input.bookingEnd,
      depositAmount: input.depositAmount ?? 0,
      rentalAmount: input.rentalAmount,
      status: input.status ?? "Requested",
    },
  });
  return { ok: true, id: agreement.id };
}

export type UpdateAgreementInput = CreateAgreementInput;

export async function updateAgreement(
  partnerId: string,
  id: string,
  input: UpdateAgreementInput
): Promise<{ ok: true } | { ok: false; conflict: AssetConflict }> {
  const existing = await prisma.rentalAgreement.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Agreement not found.");

  const conflict = await checkAssetConflict(partnerId, input.assetId, input.assetName, input.bookingStart, input.bookingEnd, id);
  if (conflict) return { ok: false, conflict };

  await prisma.rentalAgreement.update({
    where: { id },
    data: {
      assetId: input.assetId || null,
      assetName: input.assetName,
      renter: input.renter,
      bookingStart: input.bookingStart,
      bookingEnd: input.bookingEnd,
      depositAmount: input.depositAmount ?? existing.depositAmount,
      rentalAmount: input.rentalAmount,
      status: input.status ?? existing.status,
    },
  });
  return { ok: true };
}

export async function deleteAgreement(partnerId: string, id: string): Promise<void> {
  const existing = await prisma.rentalAgreement.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) return;
  await prisma.rentalAgreement.delete({ where: { id } });
}

/**
 * Records asset return: staff enters a damage charge (deducted from the
 * deposit), and refundableAmount = depositAmount - damageCharge is
 * computed server-side, clamped to >= 0 — never trusts a client-submitted
 * refundableAmount. Marks the agreement Completed, same as the previous
 * BusinessRecord-era returnAssetAction.
 */
export async function returnAsset(
  partnerId: string,
  id: string,
  damageCharge: number, // paise
  returnNotes?: string
): Promise<{ ok: true; refundableAmount: number } | { ok: false; message: string }> {
  const existing = await prisma.rentalAgreement.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) return { ok: false, message: "Booking not found." };

  const safeDamage = Math.max(0, Number(damageCharge) || 0);
  const refundableAmount = Math.max(0, existing.depositAmount - safeDamage);

  await prisma.rentalAgreement.update({
    where: { id },
    data: {
      damageCharge: safeDamage,
      refundableAmount,
      returned: true,
      returnedAt: new Date(),
      returnNotes: returnNotes || null,
      status: "Completed",
    },
  });
  return { ok: true, refundableAmount };
}

/** Days overdue (0 if not overdue / already returned), computed off bookingEnd vs. now. */
export function computeOverdueDays(bookingEnd: Date | undefined, returned: boolean, now: Date = new Date()): number {
  if (returned || !bookingEnd) return 0;
  if (Number.isNaN(bookingEnd.getTime())) return 0;
  const diffMs = now.setHours(0, 0, 0, 0) - new Date(bookingEnd).setHours(0, 0, 0, 0);
  const days = Math.floor(diffMs / 86400000);
  return days > 0 ? days : 0;
}
