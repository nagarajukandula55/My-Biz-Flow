export const RENTAL_PAYMENT_KINDS = ["Rental receipt", "Deposit receipt", "Damage receipt", "Rental refund", "Deposit refund"] as const;
export const RENTAL_PAYMENT_METHODS = ["Cash", "Manual UPI", "Card", "Bank transfer", "Other"] as const;
export type RentalPaymentKind = typeof RENTAL_PAYMENT_KINDS[number];
export type RentalPayment = { reference: string; kind: RentalPaymentKind; amount: number; note: string; at: string; reversalOf?: string; actor?: string; paymentMethod?: typeof RENTAL_PAYMENT_METHODS[number] };
export type SettlementBooking = { rentalAmount: number; depositAmount: number; damageCharge: number | null; returned: boolean; status: string };

/** Recorded money only: a contractual deposit is never assumed to have been paid. */
export function rentalSettlement(booking: SettlementBooking, entries: RentalPayment[]) {
  const total = (kind: RentalPaymentKind) => rentalPaymentTotal(entries, kind);
  const rentalPaid = total("Rental receipt") - total("Rental refund");
  const depositHeld = total("Deposit receipt") - total("Deposit refund");
  const damagePaid = total("Damage receipt");
  const cancelled = booking.status === "Cancelled";
  const damage = booking.returned ? booking.damageCharge ?? 0 : 0;
  const retained = Math.min(depositHeld, damage);
  return {
    rentalPaid, depositHeld, damagePaid, retained,
    rentalDue: Math.max(0, (cancelled ? 0 : booking.rentalAmount) - rentalPaid),
    rentalRefundDue: cancelled ? rentalPaid : 0,
    depositDue: booking.returned || cancelled ? 0 : Math.max(0, booking.depositAmount - depositHeld),
    depositRefundDue: booking.returned || cancelled ? Math.max(0, depositHeld - damage) : 0,
    damageDue: Math.max(0, damage - retained - damagePaid),
  };
}

export function rentalPaymentTotal(entries: RentalPayment[], kind: RentalPaymentKind) {
  return entries.filter(entry => entry.kind === kind).reduce((sum, entry) => sum + (entry.reversalOf ? -entry.amount : entry.amount), 0);
}

/** A correction cancels a mistaken record, never the actual payment. Originals remain immutable. */
export function validateRentalReversal(booking: SettlementBooking, entries: RentalPayment[], entry: RentalPayment) {
  if (!entry.reversalOf || !entry.reference || entry.reference.length > 100 || entry.note.length < 5 || entry.note.length > 1000) throw new Error("Select a receipt, give a unique correction reference and explain the correction in 5 to 1,000 characters.");
  const original = entries.find(item => item.reference === entry.reversalOf && !item.reversalOf);
  if (!original || original.kind !== entry.kind || original.amount !== entry.amount || original.paymentMethod !== entry.paymentMethod) throw new Error("Original payment record not found. Reload the receipt history.");
  const previous = entries.find(item => item.reference === entry.reference);
  if (previous) {
    if (previous.reversalOf === entry.reversalOf && previous.note === entry.note && previous.amount === entry.amount && previous.kind === entry.kind && previous.paymentMethod === entry.paymentMethod) return false;
    throw new Error("This reference already belongs to a different payment or correction.");
  }
  if (entries.some(item => item.reversalOf === entry.reversalOf)) throw new Error("This payment record has already been reversed.");
  if (entries.length >= 1000) throw new Error("This booking has reached its 1,000 payment record limit.");
  const next = [...entries, entry];
  const balance = rentalSettlement(booking, next);
  const damage = booking.returned ? booking.damageCharge ?? 0 : 0;
  if (balance.rentalPaid < 0 || balance.depositHeld < 0 || balance.damagePaid < 0 || balance.damagePaid + balance.retained > damage) throw new Error("This correction would leave refunded money without a receipt or overpay damage. Correct the dependent refund or damage record first.");
  return true;
}

export function validateRentalPayment(booking: SettlementBooking, entries: RentalPayment[], entry: RentalPayment) {
  if (entry.reversalOf) throw new Error("Use the correction action to reverse a payment record.");
  if (entry.paymentMethod !== undefined && !RENTAL_PAYMENT_METHODS.includes(entry.paymentMethod)) throw new Error("Choose Cash, Manual UPI, Card, Bank transfer or Other.");
  if (!RENTAL_PAYMENT_KINDS.includes(entry.kind) || !Number.isSafeInteger(entry.amount) || entry.amount <= 0 || entry.amount > 2147483647) throw new Error("Choose a payment type and a positive valid amount.");
  if (!entry.reference || entry.reference.length > 100 || entry.note.length > 1000) throw new Error("Supply a unique receipt reference (up to 100 characters) and notes up to 1,000 characters.");
  const previous = entries.find(item => item.reference === entry.reference);
  if (previous) {
    if (!previous.reversalOf && previous.kind === entry.kind && previous.amount === entry.amount && previous.note === entry.note && previous.paymentMethod === entry.paymentMethod) return false;
    throw new Error("This reference already belongs to a different payment. Check the receipt history.");
  }
  if (entries.length >= 1000) throw new Error("This booking has reached its 1,000 payment record limit.");
  const balance = rentalSettlement(booking, entries);
  const limits: Record<RentalPaymentKind, number> = {
    "Rental receipt": balance.rentalDue,
    // After return, old receipts can still be reconciled, but cannot overfund a settled damage charge.
    "Deposit receipt": booking.status === "Cancelled" || balance.damagePaid > 0 ? 0 : Math.max(0, booking.depositAmount - rentalPaymentTotal(entries, "Deposit receipt")),
    "Damage receipt": balance.damageDue,
    "Rental refund": balance.rentalRefundDue,
    "Deposit refund": balance.depositRefundDue,
  };
  if (entry.amount > limits[entry.kind]) throw new Error("Amount exceeds the available balance for this payment type. Reload and check the balances.");
  return true;
}
