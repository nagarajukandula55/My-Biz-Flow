import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { rentalQuantity } from "@/lib/rentalAssetPolicy";
import { activeRentalUnitEntries, rentalUnitSummary, validateRentalUnitEntry, type RentalUnitEntry } from "@/lib/rentalFulfillment";

/** Reverse only the latest unsettled movement while its full stock reservation still applies. */
export async function reverseRentalUnitMovement(partnerId: string, id: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const booking = await prisma.rentalAgreement.findFirst({ where: { partnerId, id } });
    if (!booking) throw Error("Booking not found.");
    const where = { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-unit-movements", recordKey: id } };
    const saved = await prisma.businessRecord.findUnique({ where });
    const entries = saved ? (saved.data as { entries: RentalUnitEntry[] }).entries : [];
    const reference = String(values.correctionReference ?? "").trim();
    const reversalOf = String(values.correctionOriginal ?? "").trim();
    const reason = String(values.correctionReason ?? "").trim();
    if (!reference || reference.length > 100 || reason.length < 5 || reason.length > 4000) throw Error("Supply a unique correction reference and a reason (5–4,000 characters).");
    const repeated = entries.find(entry => entry.reference === reference);
    if (repeated) {
      if (repeated.reversalOf === reversalOf && repeated.notes === reason) return;
      throw Error("This reference is already used.");
    }
    if (entries.length >= 1000) throw Error("Movement history limit reached.");
    const original = activeRentalUnitEntries(entries).at(-1);
    if (!original || original.reference !== reversalOf || reversalOf === "legacy-handover") throw Error("Only the latest active recorded movement can be corrected. Correct dependent movements first.");
    if (booking.returned || ["Completed", "Cancelled"].includes(booking.status) || booking.bookingEnd <= new Date()) throw Error("Settled, cancelled or overdue movements cannot be reversed because stock or refunds may already depend on them.");
    const correction: RentalUnitEntry = { ...original, reference, reversalOf, notes: reason, at: new Date().toISOString(), actor: `Owner ${partnerId}` };
    await prisma.businessRecord.update({ where, data: { data: { entries: [...entries, correction] } } });
    // Keep Ongoing: an audited pickup was recorded, even if its quantity was corrected.
  });
}

/** Immutable physical movements; no payment transfer, signature or automatic price adjustment. */
export async function recordRentalUnitMovement(partnerId: string, id: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const booking = await prisma.rentalAgreement.findFirst({ where: { partnerId, id } });
    if (!booking) throw Error("Booking not found.");
    const rows = await prisma.businessRecord.findMany({ where: { partnerId, recordKey: id, moduleSlug: { in: ["rentals-terms", "rentals-handover", "rentals-unit-movements"] } } });
    const quantity = rentalQuantity((rows.find(row => row.moduleSlug === "rentals-terms")?.data as { quantity?: unknown } | undefined)?.quantity);
    const saved = rows.find(row => row.moduleSlug === "rentals-unit-movements");
    const handover = rows.find(row => row.moduleSlug === "rentals-handover")?.data as { at: string; receivedBy: string; condition: string; reference: string } | undefined;
    if (!saved && !handover && booking.status === "Ongoing") throw Error("This legacy ongoing booking has no pickup evidence. Use its whole-booking return workflow; partial quantities cannot be inferred safely.");
    const entries: RentalUnitEntry[] = saved ? (saved.data as { entries: RentalUnitEntry[] }).entries : handover ? [{ reference: "legacy-handover", kind: "Pickup", quantity, damagePaise: 0, notes: handover.condition, recipient: handover.receivedBy, at: handover.at, actor: "Legacy owner handover" }] : [];
    const damageText = String(values.unitDamage ?? "0").trim() || "0";
    if (!/^\d+(\.\d{1,2})?$/.test(damageText)) throw Error("Enter damage in rupees with no more than two decimal places.");
    const entry: RentalUnitEntry = {
      reference: String(values.unitReference ?? "").trim(), kind: String(values.unitAction ?? "") as RentalUnitEntry["kind"], quantity: Number(values.unitQuantity),
      damagePaise: Math.round(Number(damageText) * 100), notes: String(values.unitNotes ?? "").trim(), recipient: String(values.unitRecipient ?? "").trim(), at: new Date().toISOString(), actor: `Owner ${partnerId}`,
    };
    if (!validateRentalUnitEntry(quantity, entries, entry)) return;
    if (booking.returned || ["Cancelled", "Completed"].includes(booking.status)) throw Error("Closed bookings cannot record unit movements.");
    if (entry.kind === "Pickup") {
      if (new Date() < booking.bookingStart || new Date() >= booking.bookingEnd) throw Error("Pickup must be within the booked period.");
      if (booking.assetId && !await prisma.rentalAsset.findFirst({ where: { partnerId, id: booking.assetId, isActive: true } })) throw Error("This asset is inactive and cannot be handed over.");
    }
    const next = [...entries, entry];
    const summary = rentalUnitSummary(quantity, next);
    const data = { entries: next };
    await prisma.businessRecord.upsert({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-unit-movements", recordKey: id } }, create: { partnerId, moduleSlug: "rentals-unit-movements", recordKey: id, data }, update: { data } });
    await prisma.rentalAgreement.update({ where: { id }, data: summary.complete ? {
      status: "Completed", returned: true, returnedAt: new Date(entry.at), damageCharge: summary.damagePaise,
      refundableAmount: Math.max(0, booking.depositAmount - summary.damagePaise), returnNotes: "All units returned or released. See immutable unit movement history for inspection notes.",
    } : { status: summary.pickedUp > 0 ? "Ongoing" : booking.status } });
  });
}
