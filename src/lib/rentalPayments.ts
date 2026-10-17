import { prisma } from "@/lib/prisma";
import { withRecordLock } from "@/lib/withRecordLock";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { validateRentalPayment, validateRentalReversal, type RentalPayment, type RentalPaymentKind } from "@/lib/rentalSettlement";

export async function getRentalPayments(partnerId: string, agreementId: string): Promise<RentalPayment[]> {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "rentals");
  const row = await prisma.businessRecord.findUnique({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-payments", recordKey: agreementId } } });
  return row ? (row.data as { entries: RentalPayment[] }).entries : [];
}

/** Manual evidence record, never a gateway charge or bank refund. */
export async function recordRentalPayment(partnerId: string, agreementId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  const text = String(values.paymentAmount ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("Enter an amount with no more than two decimal places.");
  const entry: RentalPayment = { reference: String(values.paymentReference ?? "").trim(), kind: String(values.paymentKind ?? "") as RentalPaymentKind, amount: Math.round(Number(text) * 100), note: String(values.paymentNote ?? "").trim(), at: new Date().toISOString(), actor: `Owner ${partnerId}`, paymentMethod: String(values.paymentMethod ?? "Cash") as RentalPayment["paymentMethod"] };
  return withRecordLock("rental-bookings", partnerId, async () => {
    const booking = await prisma.rentalAgreement.findFirst({ where: { partnerId, id: agreementId } });
    if (!booking) throw new Error("Booking not found.");
    const entries = await getRentalPayments(partnerId, agreementId);
    if (!validateRentalPayment(booking, entries, entry)) return;
    const data = { entries: [...entries, entry] };
    await prisma.businessRecord.upsert({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-payments", recordKey: agreementId } }, create: { partnerId, moduleSlug: "rentals-payments", recordKey: agreementId, data }, update: { data } });
  });
}

export async function reverseRentalPayment(partnerId: string, agreementId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "rentals");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("rental-bookings", partnerId, async () => {
    const booking = await prisma.rentalAgreement.findFirst({ where: { partnerId, id: agreementId } });
    if (!booking) throw new Error("Booking not found.");
    const entries = await getRentalPayments(partnerId, agreementId);
    const reversalOf = String(values.correctionOriginal ?? "").trim();
    const original = entries.find(item => item.reference === reversalOf && !item.reversalOf);
    if (!original) throw new Error("Original payment record not found.");
    const entry: RentalPayment = {
      reference: String(values.correctionReference ?? "").trim(), reversalOf,
      kind: original.kind, amount: original.amount,
      ...(original.paymentMethod ? { paymentMethod: original.paymentMethod } : {}),
      note: String(values.correctionReason ?? "").trim(), at: new Date().toISOString(), actor: `Owner ${partnerId}`,
    };
    if (!validateRentalReversal(booking, entries, entry)) return;
    const data = { entries: [...entries, entry] };
    await prisma.businessRecord.update({ where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "rentals-payments", recordKey: agreementId } }, data: { data } });
  });
}
