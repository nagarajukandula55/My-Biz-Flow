import { rentalQuote, readRentalTerms, type RentalTerms } from "@/lib/rentalTerms";
import { withRecordLock } from "@/lib/withRecordLock";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { readRentalAssetPolicy, rentalQuantity, exceedsRentalCapacity, type RentalAssetPolicy } from "@/lib/rentalAssetPolicy";
import { requireBookingWindow, requirePaise } from "@/lib/bookingValidation";
import { rentalReservationWindows, type RentalUnitEntry } from "@/lib/rentalFulfillment";
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
  const quantities = await bookingQuantities(partnerId, asset.agreements.map(booking => booking.id));
  return { ...asset, agreements: asset.agreements.map(booking => ({ ...booking, quantity: quantities.get(booking.id) ?? 1 })), policy: await getAssetPolicy(partnerId, id), maintenanceWindows: await getMaintenanceWindows(partnerId, id) };
}

type MaintenanceWindow = { start: string; end: string; notes: string };
async function getMaintenanceWindows(partnerId: string, assetId: string): Promise<MaintenanceWindow[]> {
  const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-maintenance", recordKey: assetId } } });
  return row ? (row.data as { windows: MaintenanceWindow[] }).windows : [];
}

export async function scheduleMaintenance(partnerId: string, assetId: string, values: Record<string, unknown>) {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const asset = await prisma.rentalAsset.findFirst({ where: { partnerId, id: assetId } });
    if (!asset) throw new Error("Asset not found.");
    const policy = readRentalAssetPolicy(values);
    if (!policy.maintenanceStart) throw new Error("Supply maintenance start and end dates.");
    const windows = await getMaintenanceWindows(partnerId, assetId);
    if (windows.length >= 100) throw new Error("Remove an old maintenance window before adding another (maximum 100).");
    const start = new Date(policy.maintenanceStart), end = new Date(policy.maintenanceEnd);
    const current = await getAssetPolicy(partnerId, assetId);
    if (windows.some(window => overlaps(start, end, new Date(window.start), new Date(window.end))) || (current.maintenanceStart && overlaps(start, end, new Date(current.maintenanceStart), new Date(current.maintenanceEnd)))) throw new Error("This maintenance window overlaps an existing maintenance period.");
    if (await checkAssetConflict(partnerId, assetId, asset.assetName, start, end, undefined, current.stockQuantity ?? 1)) throw new Error("Maintenance overlaps a booking or its preparation time. Overdue units must be returned first.");
    windows.push({ start: start.toISOString(), end: end.toISOString(), notes: policy.maintenanceNotes });
    windows.sort((a,b) => a.start.localeCompare(b.start));
    const data = { windows };
    await prisma.businessRecord.upsert({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-maintenance", recordKey: assetId } }, create: { partnerId, moduleSlug: "rentals-maintenance", recordKey: assetId, data }, update: { data } });
  });
}

export async function removeMaintenance(partnerId: string, assetId: string, start: string) {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    if (!await prisma.rentalAsset.findFirst({ where: { partnerId, id: assetId } })) throw new Error("Asset not found.");
    const windows = await getMaintenanceWindows(partnerId, assetId);
    if (!windows.some(window => window.start === start)) throw new Error("Maintenance window not found. Reload the page.");
    await prisma.businessRecord.update({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-maintenance", recordKey: assetId } }, data: { data: { windows: windows.filter(window => window.start !== start) } } });
  });
}

type AssetInput = { assetName: string; isActive?: boolean; policy?: RentalAssetPolicy };
async function getAssetPolicy(partnerId: string, id: string) {
  const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-asset-policy", recordKey: id } } });
  return readRentalAssetPolicy((row?.data ?? {}) as Record<string, unknown>);
}
async function bookingQuantities(partnerId: string, ids: string[]) {
  const rows = ids.length ? await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: "rentals-terms", recordKey: { in: ids } }, select: { recordKey: true, data: true } }) : [];
  return new Map(rows.map(row => [row.recordKey, rentalQuantity((row.data as { quantity?: unknown }).quantity)]));
}
async function bookingMovements(partnerId: string, ids: string[]) {
  const rows = ids.length ? await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: "rentals-unit-movements", recordKey: { in: ids } }, select: { recordKey: true, data: true } }) : [];
  return new Map(rows.map(row => [row.recordKey, (row.data as { entries: RentalUnitEntry[] }).entries]));
}
async function saveAssetPolicy(partnerId: string, id: string, policy: RentalAssetPolicy) {
  const data = readRentalAssetPolicy(policy);
  await prisma.businessRecord.upsert({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-asset-policy", recordKey: id } },
    create: { partnerId, moduleSlug: "rentals-asset-policy", recordKey: id, data }, update: { data } });
}
export async function createAsset(partnerId: string, data: AssetInput) {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  if (!data.assetName.trim()) throw new Error("Asset name is required.");
  return withRecordLock("rental-bookings", partnerId, async () => {
  if (await prisma.rentalAsset.findFirst({ where: { partnerId, assetName: { equals: data.assetName.trim(), mode: "insensitive" } } })) throw new Error("An asset with this name already exists. Give each physical unit a unique name.");
  const asset = await prisma.rentalAsset.create({
    data: {
      partnerId,
      assetName: data.assetName.trim(),
      isActive: data.isActive ?? true,
    },
  });
  if (data.policy) await saveAssetPolicy(partnerId, asset.id, data.policy);
  return asset;
  });
}

export async function updateAsset(partnerId: string, id: string, data: AssetInput) {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  if (!data.assetName.trim()) throw new Error("Asset name is required.");
  return withRecordLock("rental-bookings", partnerId, async () => {
  const existing = await prisma.rentalAsset.findUnique({ where: { id } });
  if (!existing || existing.partnerId !== partnerId) throw new Error("Asset not found.");
  if (await prisma.rentalAsset.findFirst({ where: { partnerId, id: { not: id }, assetName: { equals: existing.assetName, mode: "insensitive" } } })) throw new Error("Duplicate legacy asset names need review before changing this asset.");
  if (await prisma.rentalAsset.findFirst({ where: { partnerId, id: { not: id }, assetName: { equals: data.assetName.trim(), mode: "insensitive" } } })) throw new Error("An asset with this name already exists.");
  if (data.policy) {
    const policy = readRentalAssetPolicy(data.policy);
    const buffer = policy.turnaroundMinutes * 60000;
    const maintenanceWindows = await getMaintenanceWindows(partnerId, id);
    const bookings = await prisma.rentalAgreement.findMany({ where: { partnerId, status: { not: "Cancelled" }, AND: [{ OR: [{ bookingEnd: { gte: new Date(Date.now() - buffer) } }, { returnedAt: { gte: new Date(Date.now() - buffer) } }, { status: "Ongoing", returned: false }] }],
      OR: [{ assetId: id }, { assetId: null, assetName: { equals: existing.assetName, mode: "insensitive" } }] }, orderBy: { bookingStart: "asc" }, select: { id: true, bookingStart: true, bookingEnd: true, status: true, returned: true, returnedAt: true }, take: 5001 });
    if (bookings.length > 5000) throw new Error("Too many future bookings to change availability safely. Contact support.");
    const quantities = await bookingQuantities(partnerId, bookings.map(booking => booking.id));
    const movements = await bookingMovements(partnerId, bookings.map(booking => booking.id));
    const capacityWindows = bookings.flatMap(booking => rentalReservationWindows(booking, quantities.get(booking.id) ?? 1, movements.get(booking.id), buffer)).map(window => ({ ...window, start: Math.max(Date.now(), window.start) })).filter(window => window.end > window.start);
    if (exceedsRentalCapacity(policy.stockQuantity ?? 1, capacityWindows)) throw new Error("Pool quantity or preparation time overlaps existing bookings beyond capacity. Reschedule them first.");
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const windows = rentalReservationWindows(booking, quantities.get(booking.id) ?? 1, movements.get(booking.id), buffer);
      if (windows.some(reserved => maintenanceWindows.some(window => reserved.start < new Date(window.end).getTime() && new Date(window.start).getTime() < reserved.end))) throw new Error("Preparation time overlaps scheduled maintenance. Reschedule it first.");
      if (policy.maintenanceStart && windows.some(reserved => reserved.start < new Date(policy.maintenanceEnd).getTime() && new Date(policy.maintenanceStart).getTime() < reserved.end)) throw new Error("Maintenance overlaps an existing booking or its preparation time. Reschedule the booking first.");
    }
    await saveAssetPolicy(partnerId, id, policy);
  }
  // Bind legacy name-only agreements before a rename so availability history
  // cannot disappear when the catalog label changes.
  await prisma.rentalAgreement.updateMany({ where: { partnerId, assetId: null, assetName: { equals: existing.assetName, mode: "insensitive" } }, data: { assetId: id } });
  return prisma.rentalAsset.update({
    where: { id },
    data: {
      assetName: data.assetName.trim(),
      isActive: data.isActive ?? existing.isActive,
    },
  });
  });
}

// --- Agreements ---------------------------------------------------------------

export async function listAgreements(partnerId: string) {
  const agreements = await prisma.rentalAgreement.findMany({
    where: { partnerId },
    orderBy: { bookingStart: "desc" },
    include: { asset: true },
  });
  const quantities = await bookingQuantities(partnerId, agreements.map(booking => booking.id));
  return agreements.map(booking => ({ ...booking, quantity: quantities.get(booking.id) ?? 1 }));
}

export async function getAgreement(partnerId: string, id: string) {
  const agreement = await prisma.rentalAgreement.findUnique({
    where: { id },
    include: { asset: true },
  });
  if (!agreement || agreement.partnerId !== partnerId) return null;
  const extra=await prisma.businessRecord.findUnique({where:{partnerId_moduleSlug_recordKey:{partnerId,moduleSlug:"rentals-terms",recordKey:id}}});
  const handover = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-handover", recordKey: id } } });
  const movements = (await bookingMovements(partnerId, [id])).get(id);
  return {...agreement, terms: extra?.data as RentalTerms | null, handover: handover?.data as { at: string; receivedBy: string; condition: string; reference: string } | null, movements};
}

export async function recordRentalPickup(partnerId: string, id: string, values: Record<string, unknown>) {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const agreement = await prisma.rentalAgreement.findFirst({ where: { id, partnerId } });
    if (!agreement) throw new Error("Booking not found.");
    if ((await bookingMovements(partnerId, [id])).has(id)) throw new Error("Use unit movements to record the remaining pickup quantities.");
    const key = { partnerId, moduleSlug: "rentals-handover", recordKey: id };
    const receivedBy = String(values.receivedBy ?? "").trim(), condition = String(values.condition ?? "").trim(), reference = String(values.reference ?? "").trim();
    if (!receivedBy || receivedBy.length > 200 || !condition || condition.length > 4000 || reference.length > 200) throw new Error("Enter a recipient (up to 200 characters), condition notes (up to 4000), and an optional reference (up to 200).");
    const previous = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: key } });
    if (previous) {
      const saved = previous.data as Record<string, unknown>;
      if (saved.receivedBy === receivedBy && saved.condition === condition && saved.reference === reference) return;
      throw new Error("Pickup is already recorded. The original handover record cannot be overwritten.");
    }
    if (agreement.returned || ["Completed", "Cancelled"].includes(agreement.status)) throw new Error("Closed bookings cannot be collected.");
    if (agreement.assetId && !await prisma.rentalAsset.findFirst({ where: { id: agreement.assetId, partnerId, isActive: true } })) throw new Error("This asset is inactive and cannot be handed over.");
    if (new Date() < agreement.bookingStart || new Date() >= agreement.bookingEnd) throw new Error("Pickup must be within the booked period. Amend the booking dates first.");
    await prisma.businessRecord.create({ data: { ...key, data: { at: new Date().toISOString(), receivedBy, condition, reference } } });
    await prisma.rentalAgreement.update({ where: { id }, data: { status: "Ongoing" } });
  });
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
  excludeAgreementId?: string,
  requestedQuantity = 1
): Promise<AssetConflict | null> {
  if (Number.isNaN(bookingStart.getTime()) || Number.isNaN(bookingEnd.getTime())) return null;

  const policy = assetId ? await getAssetPolicy(partnerId, assetId) : readRentalAssetPolicy({});
  const quantity = rentalQuantity(requestedQuantity);
  if (quantity > (policy.stockQuantity ?? 1)) throw new Error("Requested quantity exceeds this asset pool's available units.");
  const buffer = policy.turnaroundMinutes * 60000;
  const reservedEnd = new Date(bookingEnd.getTime() + buffer);
  if (assetId && (await getMaintenanceWindows(partnerId, assetId)).some(window => overlaps(bookingStart, reservedEnd, new Date(window.start), new Date(window.end)))) throw new Error("This asset has scheduled maintenance during the booking or preparation period.");
  if (policy.maintenanceStart && overlaps(bookingStart, reservedEnd, new Date(policy.maintenanceStart), new Date(policy.maintenanceEnd))) throw new Error("This asset is unavailable for maintenance during the booking or preparation period.");
  const others = await prisma.rentalAgreement.findMany({
    where: {
      partnerId,
      status: { not: "Cancelled" },
      ...(assetId ? { OR: [{ assetId }, { assetId: null, assetName: { equals: assetName.trim(), mode: "insensitive" as const } }] } : { assetName: { equals: assetName.trim(), mode: "insensitive" as const } }),
      AND: [{ OR: [
        { bookingStart: { lt: reservedEnd }, bookingEnd: { gt: new Date(bookingStart.getTime() - buffer) } },
        { returnedAt: { gt: new Date(bookingStart.getTime() - buffer) }, bookingStart: { lt: reservedEnd } },
        { status: "Ongoing", returned: false, bookingEnd: { lte: new Date() } },
      ] }],
      ...(excludeAgreementId ? { id: { not: excludeAgreementId } } : {}),
    }, select: { id: true, renter: true, bookingStart: true, bookingEnd: true, status: true, returned: true, returnedAt: true }, take: 5001,
  });
  if (others.length > 5000) throw new Error("Too many overlapping bookings to check availability safely. Contact support.");
  const quantities = await bookingQuantities(partnerId, others.map(other => other.id));
  const movements = await bookingMovements(partnerId, others.map(other => other.id));
  const windows = others.flatMap(other => rentalReservationWindows(other, quantities.get(other.id) ?? 1, movements.get(other.id), buffer)).map(window => ({ ...window, start: Math.max(bookingStart.getTime(), window.start), end: Math.min(reservedEnd.getTime(), window.end) })).filter(window => window.end > window.start);
  if (!exceedsRentalCapacity(policy.stockQuantity ?? 1, [...windows, { start: bookingStart.getTime(), end: reservedEnd.getTime(), quantity }])) return null;
  const other = others[0];
  return { agreementId: other.id, renter: other.renter, bookingStart: other.bookingStart, bookingEnd: other.bookingEnd };
}

export type CreateAgreementInput = {
  assetId?: string;
  assetName: string;
  renter: string;
  bookingStart: Date;
  bookingEnd: Date;
  depositAmount?: number; // paise
  rentalAmount: number; // paise
  terms?: RentalTerms;
  status?: RentalAgreementStatus;
};

async function validateAgreement(partnerId: string, input: CreateAgreementInput): Promise<CreateAgreementInput> {
  requireBookingWindow(input.bookingStart, input.bookingEnd);
  if(input.terms) {
    const terms=readRentalTerms({...input.terms,rentalCategory:input.terms.category,rateRupees:input.terms.ratePaise/100});
    input={...input,terms,rentalAmount:rentalQuote(terms,input.bookingStart,input.bookingEnd,input.rentalAmount)};
  }
  requirePaise(input.rentalAmount);
  if (input.depositAmount !== undefined) requirePaise(input.depositAmount);
  if (input.status && !RENTAL_AGREEMENT_STATUSES.includes(input.status)) throw new Error("Invalid agreement status.");
  const asset = await prisma.rentalAsset.findFirst({ where: { partnerId, ...(input.assetId ? { id: input.assetId } : { assetName: { equals: input.assetName.trim(), mode: "insensitive" } }) } });
  if (input.assetId && !asset) throw new Error("Asset not found.");
  if (asset && !asset.isActive && input.status !== "Cancelled") throw new Error("This asset is inactive. Reactivate it before accepting bookings.");
  const assetName = asset?.assetName ?? input.assetName.trim();
  if (!assetName || !input.renter.trim()) throw new Error("Asset and renter are required.");
  return { ...input, assetId: asset?.id ?? input.assetId, assetName };
}

export async function createAgreement(
  partnerId: string,
  input: CreateAgreementInput
): Promise<{ ok: true; id: string } | { ok: false; conflict: AssetConflict }> {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    input = await validateAgreement(partnerId, input);
    const conflict = input.status === "Cancelled" ? null : await checkAssetConflict(partnerId, input.assetId, input.assetName, input.bookingStart, input.bookingEnd, undefined, input.terms?.quantity ?? 1);
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
    if(input.terms) await saveRentalTerms(partnerId,agreement.id,input.terms);
    return { ok: true, id: agreement.id };
  });
}

export type UpdateAgreementInput = CreateAgreementInput;

/** Reserve independently tracked items together; a failed line rolls back every line. */
export async function createAgreementBatch(partnerId: string, inputs: CreateAgreementInput[]) {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  if (!Array.isArray(inputs) || inputs.length < 2 || inputs.length > 20) throw new Error("Select between 2 and 20 catalog assets.");
  if (inputs.some(input => !input.assetId) || new Set(inputs.map(input => input.assetId)).size !== inputs.length) throw new Error("Select distinct catalog assets.");
  return withRecordLock("rental-bookings", partnerId, async () => {
    const ids: string[] = [];
    for (const input of inputs) {
      const result = await createAgreement(partnerId, input);
      if (!result.ok) throw new Error(`An item is unavailable for these dates (${result.conflict.renter}). No items were booked.`);
      ids.push(result.id);
    }
    await prisma.businessRecord.createMany({ data: ids.map(id => ({ partnerId, moduleSlug: "rentals-batch", recordKey: id, data: { agreementIds: ids } })) });
    return { id: ids[0], ids };
  });
}

export async function getAgreementBatch(partnerId: string, id: string) {
  await assertModuleAccess(partnerId, "rentals");
  const record = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-batch", recordKey: id } } });
  if (!record) return [];
  const ids = (record.data as { agreementIds?: unknown }).agreementIds;
  if (!Array.isArray(ids) || ids.length > 20 || !ids.every(value => typeof value === "string") || !ids.includes(id)) throw new Error("Invalid linked booking record.");
  const lines = await prisma.rentalAgreement.findMany({ where: { partnerId, id: { in: ids } }, orderBy: { createdAt: "asc" } });
  if (lines.length !== ids.length) throw new Error("A linked booking item is missing. Contact support.");
  const quantities = await bookingQuantities(partnerId, ids);
  return lines.map(line => ({ ...line, quantity: quantities.get(line.id) ?? 1 }));
}

export async function updateAgreement(
  partnerId: string,
  id: string,
  input: UpdateAgreementInput
): Promise<{ ok: true } | { ok: false; conflict: AssetConflict }> {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const existing = await prisma.rentalAgreement.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) throw new Error("Agreement not found.");
    if (existing.returned) throw new Error("A returned booking cannot be edited. Create a new booking for another rental.");
    if ((await bookingMovements(partnerId, [id])).has(id)) throw new Error("Bookings with unit movement history are immutable. Use unit movements to return or release remaining units.");
    const handover = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-handover", recordKey: id } } });
    if (handover && (input.assetId !== (existing.assetId ?? undefined) || input.renter.trim() !== existing.renter.trim() || input.bookingStart.getTime() !== existing.bookingStart.getTime() || (input.status && input.status !== "Ongoing"))) throw new Error("Collected items must keep their asset, renter, start time and Ongoing status. Use Return Asset to close them.");

    input = await validateAgreement(partnerId, input);
    const existingQuantity = (await bookingQuantities(partnerId, [id])).get(id) ?? 1;
    const nextQuantity = input.terms?.quantity ?? existingQuantity;
    const payments = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-payments", recordKey: id } } });
    if ((handover || payments) && nextQuantity !== existingQuantity) throw new Error("Collected bookings and bookings with payment history must retain their quantity.");
    if (payments && (input.assetId !== (existing.assetId ?? undefined) || input.assetName !== existing.assetName || input.renter !== existing.renter || input.rentalAmount !== existing.rentalAmount || (input.depositAmount ?? existing.depositAmount) !== existing.depositAmount || (existing.status === "Cancelled" && input.status !== "Cancelled"))) throw new Error("Bookings with payment history must retain their renter, asset and prices. Cancelled paid bookings cannot be reopened.");
    const conflict = (input.status ?? existing.status) === "Cancelled" ? null : await checkAssetConflict(partnerId, input.assetId, input.assetName, input.bookingStart, input.bookingEnd, id, nextQuantity);
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
    if(input.terms) await saveRentalTerms(partnerId,id,input.terms);
    return { ok: true };
  });
}

export async function deleteAgreement(partnerId: string, id: string): Promise<void> {
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const existing = await prisma.rentalAgreement.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) return;
    if (existing.returned) throw new Error("Returned bookings are retained as settlement records and cannot be deleted.");
    if ((await bookingMovements(partnerId, [id])).has(id)) throw new Error("Bookings with unit movement history must be retained.");
    if (await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-payments", recordKey: id } } })) throw new Error("Bookings with payment history must be retained. Cancel the booking instead.");
    const batch = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-batch", recordKey: id } } });
    if (batch) throw new Error("Linked booking items must be retained. Cancel the item instead of deleting it.");
    if (await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-handover", recordKey: id } } })) throw new Error("Collected bookings must be retained. Record the return instead.");
    await prisma.businessRecord.deleteMany({where:{partnerId,moduleSlug:"rentals-terms",recordKey:id}});
    await prisma.rentalAgreement.delete({ where: { id } });
  });
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
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const existing = await prisma.rentalAgreement.findUnique({ where: { id } });
    if (!existing || existing.partnerId !== partnerId) return { ok: false, message: "Booking not found." };
    if (existing.returned) return { ok: true, refundableAmount: existing.refundableAmount ?? 0 };
    if ((await bookingMovements(partnerId, [id])).has(id)) throw new Error("Use unit movements to record remaining returns and damage charges.");

    if (existing.status === "Cancelled") return { ok: false, message: "A cancelled booking cannot be returned." };
    requirePaise(damageCharge);
    const safeDamage = damageCharge;
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
  });
}

export { computeOverdueDays } from "@/lib/rentalRules";

async function saveRentalTerms(partnerId:string,id:string,terms:RentalTerms) {
  await prisma.businessRecord.upsert({where:{partnerId_moduleSlug_recordKey:{partnerId,moduleSlug:"rentals-terms",recordKey:id}},create:{partnerId,moduleSlug:"rentals-terms",recordKey:id,data:terms},update:{data:terms}});
}
