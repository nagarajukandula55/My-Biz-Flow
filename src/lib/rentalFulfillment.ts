export const RENTAL_UNIT_ACTIONS = ["Pickup", "Return", "Release uncollected"] as const;
export type RentalUnitEntry = { reference: string; kind: typeof RENTAL_UNIT_ACTIONS[number]; quantity: number; damagePaise: number; notes: string; recipient: string; at: string; actor: string; reversalOf?: string };
export function activeRentalUnitEntries(entries: RentalUnitEntry[]) {
  const reversed = new Set(entries.filter(entry => entry.reversalOf).map(entry => entry.reversalOf));
  return entries.filter(entry => !entry.reversalOf && !reversed.has(entry.reference));
}
export function rentalUnitSummary(quantity: number, entries: RentalUnitEntry[]) {
  let pickedUp = 0, returned = 0, released = 0, damagePaise = 0;
  for (const entry of activeRentalUnitEntries(entries)) {
    if (entry.kind === "Pickup") pickedUp += entry.quantity;
    if (entry.kind === "Return") { returned += entry.quantity; damagePaise += entry.damagePaise; }
    if (entry.kind === "Release uncollected") released += entry.quantity;
  }
  return { pickedUp, returned, released, damagePaise, awaitingPickup: quantity - pickedUp - released, outstanding: pickedUp - returned, complete: returned + released === quantity };
}
export function validateRentalUnitEntry(quantity: number, entries: RentalUnitEntry[], entry: RentalUnitEntry) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000 || !RENTAL_UNIT_ACTIONS.includes(entry.kind) || !Number.isInteger(entry.quantity) || entry.quantity < 1 || entry.quantity > quantity) throw Error("Choose an action and a valid whole-unit quantity.");
  if (!entry.reference || entry.reference.length > 100 || entry.notes.length < 5 || entry.notes.length > 4000 || entry.recipient.length > 200 || (entry.kind === "Pickup" && !entry.recipient)) throw Error("Supply a unique reference, inspection/release notes (5–4,000 characters), and a pickup recipient (up to 200 characters).");
  if (!Number.isSafeInteger(entry.damagePaise) || entry.damagePaise < 0 || entry.damagePaise > 2147483647 || (entry.kind !== "Return" && entry.damagePaise !== 0)) throw Error("Damage charges apply only to returned units and must be a valid non-negative amount.");
  const previous = entries.find(item => item.reference === entry.reference);
  if (previous) {
    if (previous.kind === entry.kind && previous.quantity === entry.quantity && previous.damagePaise === entry.damagePaise && previous.notes === entry.notes && previous.recipient === entry.recipient) return false;
    throw Error("This reference already belongs to a different unit movement.");
  }
  if (entries.length >= 1000) throw Error("This booking has reached its 1,000 movement limit.");
  const summary = rentalUnitSummary(quantity, entries);
  if (entry.quantity > (entry.kind === "Return" ? summary.outstanding : summary.awaitingPickup)) throw Error("Quantity exceeds the units available for this action. Reload the booking.");
  if (summary.damagePaise + entry.damagePaise > 2147483647) throw Error("Total damage exceeds the supported amount.");
  return true;
}

/** Keep the contracted window; late returned units remain unavailable through preparation time. */
export function rentalReservationWindows(booking: { bookingStart: Date; bookingEnd: Date; status: string; returned: boolean; returnedAt?: Date | null }, quantity: number, entries: RentalUnitEntry[] | undefined, buffer: number, now = Date.now()) {
  const start = booking.bookingStart.getTime(), end = booking.bookingEnd.getTime();
  if (!entries) return [{ start, end: booking.status === "Ongoing" && !booking.returned && end <= now ? Infinity : Math.max(end, booking.returnedAt?.getTime() ?? end) + buffer, quantity }];
  const summary = rentalUnitSummary(quantity, entries);
  const windows = activeRentalUnitEntries(entries).filter(entry => entry.kind === "Return").map(entry => ({ start, end: Math.max(end, new Date(entry.at).getTime()) + buffer, quantity: entry.quantity }));
  if (summary.outstanding) windows.push({ start, end: end <= now ? Infinity : end + buffer, quantity: summary.outstanding });
  const uncollected = quantity - summary.pickedUp;
  if (uncollected) windows.push({ start, end: end + buffer, quantity: uncollected });
  return windows;
}
