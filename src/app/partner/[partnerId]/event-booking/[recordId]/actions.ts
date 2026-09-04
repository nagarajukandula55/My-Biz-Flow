"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { extractEventBookingLifecycle, type ChecklistItem } from "@/lib/sample-data/event-booking";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/**
 * Server-side venue availability check: a venue cannot be double-booked
 * for overlapping date ranges. Independent implementation from Rentals'
 * checkAssetAvailabilityAction — same overlap concept, own module, no
 * cross-import. Events are currently modeled as single-day (eventDate),
 * so the "range" is the day itself unless start/end fields are present.
 */
export async function checkVenueAvailabilityAction(
  partnerId: string,
  eventId: string,
  venue: string,
  eventStart: string,
  eventEnd: string
): Promise<{ conflict: boolean; conflictingEventId?: string }> {
  if (!venue || !eventStart || !eventEnd) return { conflict: false };
  const rows = await listBusinessRecords(partnerId, "event-booking");
  for (const row of rows) {
    const id = String(row["id"]);
    if (id === eventId) continue;
    if (row["status"] === "Cancelled") continue;
    if (row["venue"] !== venue) continue;
    const date = row["eventDate"] as string | undefined;
    if (!date) continue;
    const start = (row["eventStart"] as string | undefined) ?? date;
    const end = (row["eventEnd"] as string | undefined) ?? date;
    if (overlaps(eventStart, eventEnd, start, end)) {
      return { conflict: true, conflictingEventId: id };
    }
  }
  return { conflict: false };
}

/** Saves the venue + event date after a server-side conflict check. */
export async function saveVenueBookingAction(
  partnerId: string,
  eventId: string,
  venue: string,
  eventDate: string
): Promise<{ ok: boolean; message?: string }> {
  const check = await checkVenueAvailabilityAction(partnerId, eventId, venue, eventDate, eventDate);
  if (check.conflict) {
    return {
      ok: false,
      message: `${venue} is already booked (${check.conflictingEventId}) for an overlapping date. Choose a different venue or date.`,
    };
  }
  const record = await getBusinessRecord(partnerId, "event-booking", eventId);
  if (!record) return { ok: false, message: "Event not found." };
  await updateBusinessRecord(partnerId, "event-booking", eventId, { ...record, venue, eventDate });
  revalidatePath(`/partner/${partnerId}/event-booking/${eventId}`);
  return { ok: true };
}

/**
 * Sets up (or edits) the payment schedule for an event: total cost,
 * deposit amount/due date, and balance amount/due date. balanceAmount is
 * always recomputed server-side as totalCost - depositAmount — never
 * trusted from the client.
 */
export async function setPaymentScheduleAction(
  partnerId: string,
  eventId: string,
  totalCost: number,
  depositAmount: number,
  depositDueDate: string,
  balanceDueDate: string
): Promise<{ ok: boolean; message?: string }> {
  const record = await getBusinessRecord(partnerId, "event-booking", eventId);
  if (!record) return { ok: false, message: "Event not found." };
  if (totalCost <= 0) return { ok: false, message: "Total cost must be greater than zero." };
  if (depositAmount < 0 || depositAmount > totalCost) {
    return { ok: false, message: "Deposit amount must be between 0 and the total cost." };
  }
  const balanceAmount = Math.max(0, totalCost - depositAmount);
  await updateBusinessRecord(partnerId, "event-booking", eventId, {
    ...record,
    totalCost,
    depositAmount,
    depositDueDate,
    balanceAmount,
    balanceDueDate,
  });
  revalidatePath(`/partner/${partnerId}/event-booking/${eventId}`);
  return { ok: true };
}

/**
 * Records payment of an installment ("deposit" or "balance") by creating
 * a real Billing invoice — mirrors createInvoiceFromWorkorderAction in
 * service-centre/[recordId]/actions.ts, reusing the same
 * createBusinessRecord(partnerId, "billing", {...}) path rather than a
 * bespoke invoicing shortcut. Never trusts a client-submitted amount: the
 * amount is read off the event's own persisted schedule fields.
 */
export async function recordEventPaymentAction(
  partnerId: string,
  eventId: string,
  installment: "deposit" | "balance"
): Promise<{ ok: boolean; message?: string }> {
  const record = await getBusinessRecord(partnerId, "event-booking", eventId);
  if (!record) return { ok: false, message: "Event not found." };
  const lifecycle = extractEventBookingLifecycle(record);

  if (installment === "deposit" && lifecycle.depositInvoiceId) {
    return { ok: false, message: "Deposit already invoiced." };
  }
  if (installment === "balance" && lifecycle.balanceInvoiceId) {
    return { ok: false, message: "Balance already invoiced." };
  }

  const amount = installment === "deposit" ? lifecycle.depositAmount ?? 0 : lifecycle.balanceAmount ?? 0;
  if (!amount || amount <= 0) {
    return { ok: false, message: `No ${installment} amount set on this event's payment schedule.` };
  }

  const subtotal = amount;
  const taxAmount = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + taxAmount;

  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: record["organizer"] ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: installment === "deposit" ? lifecycle.depositDueDate : lifecycle.balanceDueDate,
    lineItemsSummary: `${record["eventName"] ?? eventId} — ${installment === "deposit" ? "Deposit" : "Balance"} payment`,
    subtotal,
    taxAmount,
    totalAmount,
    paymentStatus: "Draft",
    paymentMode: undefined,
    sourceEventId: eventId,
  });

  const patch: Record<string, unknown> =
    installment === "deposit"
      ? { depositPaid: true, depositInvoiceId: invoice.id }
      : { balancePaid: true, balanceInvoiceId: invoice.id };

  await updateBusinessRecord(partnerId, "event-booking", eventId, { ...record, ...patch });
  revalidatePath(`/partner/${partnerId}/event-booking/${eventId}`);
  return { ok: true };
}

/**
 * Manages the vendor/catering checklist stored on the event record — add,
 * toggle done, or remove a line item. `action` decides the operation;
 * `item` carries the payload appropriate to it.
 */
export async function updateChecklistAction(
  partnerId: string,
  eventId: string,
  action: "add" | "toggle" | "remove",
  payload: { itemId?: string; item?: string; assigned?: string }
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "event-booking", eventId);
  if (!record) return;
  const checklist = (record["checklist"] as ChecklistItem[] | undefined) ?? [];

  let next: ChecklistItem[];
  if (action === "add") {
    if (!payload.item) return;
    next = [
      ...checklist,
      { id: `CHK-${Date.now()}`, item: payload.item, assigned: payload.assigned, done: false },
    ];
  } else if (action === "toggle") {
    next = checklist.map((c) => (c.id === payload.itemId ? { ...c, done: !c.done } : c));
  } else {
    next = checklist.filter((c) => c.id !== payload.itemId);
  }

  await updateBusinessRecord(partnerId, "event-booking", eventId, { ...record, checklist: next });
  revalidatePath(`/partner/${partnerId}/event-booking/${eventId}`);
}
