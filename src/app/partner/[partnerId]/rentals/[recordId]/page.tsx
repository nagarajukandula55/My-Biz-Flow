import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail, type RecordField, type TimelineEntry } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { getAgreement, getAgreementBatch } from "@/lib/rentals";
import { LinkedRecordTable } from "@/components/LinkedRecordTable";
import { formatDateTime, formatCurrencyINR } from "@/lib/format";
import { RecordForm } from "@/components/RecordForm";
import { pickupAction, rentalPaymentAction, rentalPaymentCorrectionAction, rentalUnitMovementAction } from "../actions";
import { rentalUnitSummary, type RentalUnitEntry } from "@/lib/rentalFulfillment";
import { getRentalPayments } from "@/lib/rentalPayments";
import { RENTAL_PAYMENT_KINDS, RENTAL_PAYMENT_METHODS, rentalSettlement } from "@/lib/rentalSettlement";
import { DataTable } from "@/components/DataTable";
import { RentalsLifecycle } from "./RentalsLifecycle";
import { DeleteRentalAgreementButton } from "./DeleteRentalAgreementButton";

registerPage({
  id: "rentals.detail",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Detail",
  path: "/partner/[partnerId]/rentals/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
    { key: "timeline", label: "Activity timeline" },
  ],
  explanation: "Read-only detail view of a single RentalAgreement booking (Prisma-backed), rendered via the shared RecordDetail component (field grid + activity timeline), with Edit and Delete actions in the header. The RentalsLifecycle panel above it carries the real domain logic: an Overdue badge (days-overdue count) when the return date has passed unreturned, and a Return Asset action that records a damage charge and computes refundableAmount server-side.",
  sourceFile: "src/app/partner/[partnerId]/rentals/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Requested: "warning",
  Confirmed: "teal",
  Ongoing: "amber",
  Completed: "success",
  Cancelled: "danger",
};

export default async function RentalsDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const agreement = await getAgreement(params.partnerId, params.recordId);
  if (!agreement) notFound();
  const batch = await getAgreementBatch(params.partnerId, agreement.id);
  const payments = await getRentalPayments(params.partnerId, agreement.id);
  const settlement = rentalSettlement(agreement, payments);
  const correctablePayments = payments.filter(payment => !payment.reversalOf && !payments.some(correction => correction.reversalOf === payment.reference));
  const quantity = agreement.terms?.quantity ?? 1;
  const unitEntries: RentalUnitEntry[] = agreement.movements ?? (agreement.handover ? [{ reference: "legacy-handover", kind: "Pickup", quantity, damagePaise: 0, notes: agreement.handover.condition, recipient: agreement.handover.receivedBy, at: agreement.handover.at, actor: "Legacy owner handover" }] : []);
  const units = rentalUnitSummary(quantity, unitEntries);
  const legacyOngoingWithoutPickup = agreement.status === "Ongoing" && !agreement.handover && !agreement.movements;
  const useUnitMovements = (quantity > 1 && !legacyOngoingWithoutPickup) || !!agreement.movements;
  const unitActions = [
    ...(units.awaitingPickup > 0 && new Date() >= agreement.bookingStart && new Date() < agreement.bookingEnd ? ["Pickup"] : []),
    ...(units.outstanding > 0 ? ["Return"] : []),
    ...(units.awaitingPickup > 0 ? ["Release uncollected"] : []),
  ];

  const fields: RecordField[] = [
    { label: "Booked quantity", value: String(agreement.terms?.quantity ?? 1), type: "text" },
    ...(agreement.handover ? [
      { label: "Collected (IST)", value: formatDateTime(agreement.handover.at), type: "text" as const },
      { label: "Received by", value: agreement.handover.receivedBy, type: "text" as const },
      { label: "Condition at pickup", value: agreement.handover.condition, type: "text" as const },
      { label: "Handover reference", value: agreement.handover.reference, type: "text" as const },
    ] : []),
    ...(agreement.terms ? [
      {label:"Rental category",value:agreement.terms.category,type:"text" as const},
      {label:"Pricing basis",value:agreement.terms.rateUnit,type:"text" as const},
      {label:"Rate per period",value:agreement.terms.ratePaise/100,type:"currency" as const},
      {label:"Pickup / delivery",value:agreement.terms.pickupInstructions,type:"text" as const},
      {label:"Return / collection",value:agreement.terms.returnInstructions,type:"text" as const},
      {label:"Cancellation terms",value:agreement.terms.cancellationTerms,type:"text" as const},
    ] : []),
    { label: "Asset / Venue Name", value: agreement.assetName, type: "text" },
    { label: "Renter", value: agreement.renter, type: "text" },
    { label: "Booking Start (IST)", value: formatDateTime(agreement.bookingStart.toISOString()), type: "text" },
    { label: "Booking End (IST)", value: formatDateTime(agreement.bookingEnd.toISOString()), type: "text" },
    { label: "Deposit Amount", value: agreement.depositAmount / 100, type: "currency" },
    { label: "Rental Amount", value: agreement.rentalAmount / 100, type: "currency" },
    { label: "Status", value: agreement.status, type: "select", chipVariant: STATUS_VARIANT[agreement.status] ?? "neutral" },
  ];

  const timeline: TimelineEntry[] = [
    { id: "t1", label: "Booking created", timestamp: agreement.createdAt.toISOString(), actor: "Rentals Desk" },
    ...(agreement.returned && agreement.returnedAt
      ? [{ id: "t2", label: "Asset returned", timestamp: agreement.returnedAt.toISOString(), actor: "Rentals Desk" }]
      : []),
  ];

  const recordLabel = `${agreement.assetName} — ${agreement.renter}`;

  return (
    <AppShell topbarTitle={mod?.label ?? "Rentals / Booking"}>
      <div>
        {batch.length > 0 && <section className="mb-8" aria-label="Linked booking items">
          <h2 className="font-display text-xl font-bold text-text">Linked booking · {batch.filter(item => item.returned).length} of {batch.length} items returned</h2>
          <p className="my-2 text-sm text-text-muted">Open an item to edit, cancel or record its return. Contract deposit calculations assume full payment; each item's receipt history shows its actual refund balance.</p>
          <LinkedRecordTable rows={batch.map(item => ({ id: item.id, href: `/partner/${params.partnerId}/rentals/${item.id}`, asset: item.assetName, quantity: item.quantity, status: item.returned ? "Returned" : item.status, rental: item.rentalAmount / 100, deposit: item.depositAmount / 100, refundable: item.returned ? formatCurrencyINR((item.refundableAmount ?? 0) / 100) : "Not returned" }))} columns={[
            { key: "asset", label: "Asset", type: "text" }, { key: "status", label: "Status", type: "text" },
            { key: "quantity", label: "Units", type: "text" },
            { key: "rental", label: "Rental", type: "currency" }, { key: "deposit", label: "Deposit", type: "currency" }, { key: "refundable", label: "Contract deposit less damage", type: "text" },
          ]} />
        </section>}
        {!useUnitMovements && !agreement.handover && !agreement.returned && !["Cancelled", "Completed"].includes(agreement.status) && <section className="my-8" aria-label="Record pickup">
          <h2 className="font-display text-xl font-bold text-text">Record item pickup</h2>
          <p className="my-3 text-sm text-text-muted">Record each line when all its units are handed over. This line contains {agreement.terms?.quantity ?? 1} unit(s), collected and returned together. For linked bookings, collecting one line leaves the others awaiting pickup. Handover details are retained; this is not an electronic signature.</p>
          <RecordForm fields={[{ key: "receivedBy", label: "Received by", type: "text", required: true }, { key: "condition", label: "Condition / inspection notes", type: "textarea", required: true }, { key: "reference", label: "Handover reference", type: "text" }]} submitLabel="Record pickup" action={pickupAction.bind(null, params.partnerId, agreement.id)} />
        </section>}
        <RentalsLifecycle
          partnerId={params.partnerId}
          bookingId={agreement.id}
          bookingEnd={agreement.bookingEnd.toISOString()}
          depositAmount={agreement.depositAmount / 100}
          status={agreement.status}
          returned={agreement.returned}
          refundableAmount={agreement.refundableAmount != null ? agreement.refundableAmount / 100 : undefined}
          damageCharge={agreement.damageCharge != null ? agreement.damageCharge / 100 : undefined}
          allowWholeReturn={!useUnitMovements}
        />

        {useUnitMovements && <section className="my-8" aria-label="Rental unit movements">
          <h2 className="font-display text-xl font-bold text-text">Unit pickups and returns</h2>
          <p className="my-3 text-sm text-text-muted">Record each partial pickup or return with its own reference and inspection notes. Release units the customer will not collect. Prices are not automatically reduced. The deposit settles after every unit is returned or released. Units remain reserved through the contracted end; late returns also require preparation time. These records are retained and are not electronic signatures.</p>
          {agreement.returned && !agreement.movements ? <p className="my-3 text-sm text-text-muted">This booking was closed using the legacy whole-booking return. No partial movement history was recorded.</p> : <RecordDetail recordLabel="Unit balances" fields={[
            { label: "Booked units", value: String(quantity), type: "text" },
            { label: "Awaiting pickup / release", value: String(units.awaitingPickup), type: "text" },
            { label: "With customer", value: String(units.outstanding), type: "text" },
            { label: "Returned units", value: String(units.returned), type: "text" },
            { label: "Uncollected units released", value: String(units.released), type: "text" },
            { label: "Recorded damage total", value: units.damagePaise / 100, type: "currency" },
          ]} />}
          <DataTable columns={[
            { key: "at", label: "Recorded (IST)", type: "text" }, { key: "kind", label: "Action", type: "text" }, { key: "quantity", label: "Units", type: "text" },
            { key: "damage", label: "Damage", type: "currency" }, { key: "reference", label: "Reference", type: "text" }, { key: "recipient", label: "Pickup recipient", type: "text" }, { key: "notes", label: "Inspection / release notes", type: "text" }, { key: "actor", label: "Recorded by", type: "text" },
          ]} rows={unitEntries.map(entry => ({ ...entry, id: entry.reference, at: formatDateTime(entry.at), damage: entry.damagePaise / 100 }))} />
          {!agreement.returned && !["Cancelled", "Completed"].includes(agreement.status) && unitActions.length > 0 && <RecordForm fields={[
            { key: "unitAction", label: "Unit action", type: "select", options: unitActions, required: true },
            { key: "unitQuantity", label: "Number of units in this movement", type: "number", required: true },
            { key: "unitReference", label: "Unique movement reference", type: "text", required: true },
            { key: "unitRecipient", label: "Pickup recipient (required for pickup)", type: "text" },
            { key: "unitDamage", label: "Damage for these returned units only (₹)", type: "currency", help: "Leave zero for pickup or release. Return charges are added to earlier return charges." },
            { key: "unitNotes", label: "Inspection notes / reason for releasing uncollected units", type: "textarea", required: true },
          ]} submitLabel="Record unit movement" action={rentalUnitMovementAction.bind(null, params.partnerId, agreement.id)} />}
        </section>}

        <section className="my-8" aria-label="Rental receipts and refunds">
          <h2 className="font-display text-xl font-bold text-text">Receipts and refunds</h2>
          <p className="my-3 text-sm text-text-muted">Record payments already made, using a unique receipt or bank reference for this item. This history does not move money or verify bank transactions. Existing deposits are not assumed paid. Rental refunds are available after cancellation; deposit refunds after cancellation or return. Record all deposit receipts before collecting any remaining damage balance.</p>
          <RecordDetail recordLabel="Recorded payment balances" fields={[
            { label: "Rental still due", value: settlement.rentalDue / 100, type: "currency" },
            { label: "Deposit still due", value: settlement.depositDue / 100, type: "currency" },
            { label: "Recorded deposit held", value: settlement.depositHeld / 100, type: "currency" },
            { label: "Deposit retained for damage", value: settlement.retained / 100, type: "currency" },
            { label: "Additional damage still due", value: settlement.damageDue / 100, type: "currency" },
            { label: "Deposit refund still due", value: settlement.depositRefundDue / 100, type: "currency" },
            { label: "Cancelled rental refund still due", value: settlement.rentalRefundDue / 100, type: "currency" },
          ]} />
          <DataTable columns={[{ key: "at", label: "Recorded (IST)", type: "text" }, { key: "kind", label: "Type", type: "text" }, { key: "paymentMethod", label: "Method", type: "text" }, { key: "amount", label: "Amount", type: "currency" }, { key: "reference", label: "Receipt reference", type: "text" }, { key: "reversalOf", label: "Reverses record", type: "text" }, { key: "actor", label: "Recorded by", type: "text" }, { key: "note", label: "Notes / correction reason", type: "text" }]} rows={payments.map(payment => ({ ...payment, id: payment.reference, at: formatDateTime(payment.at), kind: payment.reversalOf ? `${payment.kind} — correction` : payment.kind, amount: payment.amount * (payment.reversalOf ? -1 : 1) / 100, actor: payment.actor ?? "Legacy owner record", paymentMethod: payment.paymentMethod ?? "Not recorded" }))} />
          <RecordForm fields={[
            { key: "paymentKind", label: "Payment type", type: "select", options: [...RENTAL_PAYMENT_KINDS], required: true },
            { key: "paymentMethod", label: "Payment method", type: "select", options: [...RENTAL_PAYMENT_METHODS], required: true, help: "Record a completed cash, manual UPI or other payment. No payment provider is required." },
            { key: "paymentAmount", label: "Amount (₹)", type: "currency", required: true },
            { key: "paymentReference", label: "Unique receipt / bank reference", type: "text", required: true },
            { key: "paymentNote", label: "Payment notes", type: "textarea" },
          ]} submitLabel="Record completed payment" action={rentalPaymentAction.bind(null, params.partnerId, agreement.id)} />
          {correctablePayments.length > 0 && <div className="mt-8">
            <h3 className="font-display text-lg font-bold text-text">Correct a mistaken payment record</h3>
            <p className="my-3 text-sm text-text-muted">Reverse the entire mistaken record, then enter the correct payment with a new reference. The original and correction are both retained. This only corrects your records: use a refund entry for money actually refunded. Dependent refund or damage records may need correcting first.</p>
            <RecordForm fields={[
              { key: "correctionOriginal", label: "Payment record to reverse", type: "select", options: correctablePayments.map(payment => payment.reference), optionLabels: Object.fromEntries(correctablePayments.map(payment => [payment.reference, `${payment.reference} · ${payment.kind} · ${formatCurrencyINR(payment.amount / 100)}`])), required: true },
              { key: "correctionReference", label: "Unique correction reference", type: "text", required: true },
              { key: "correctionReason", label: "Reason for correction", type: "textarea", required: true },
            ]} submitLabel="Reverse mistaken record" action={rentalPaymentCorrectionAction.bind(null, params.partnerId, agreement.id)} />
          </div>}
        </section>
        <div className="mt-8">
          <RecordDetail
            fields={fields}
            recordLabel={recordLabel}
            searchParams={searchParams}
            timeline={timeline}
            headerSlot={
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-bold text-text">{recordLabel}</h1>
                  <p className="mt-1 text-xs text-text-muted">Booking detail</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/partner/${params.partnerId}/rentals`} className="btn-outline">
                    &larr; Back
                  </Link>
                  {agreement.assetId && (
                    <Link href={`/partner/${params.partnerId}/rentals/assets/${agreement.assetId}`} className="btn-outline">
                      View Asset
                    </Link>
                  )}
                  {!agreement.returned && !agreement.movements && <Link href={`/partner/${params.partnerId}/rentals/${params.recordId}/edit`} className="btn-outline">
                    Edit
                  </Link>}
                  {!agreement.returned && !agreement.handover && !agreement.movements && batch.length === 0 && payments.length === 0 && <DeleteRentalAgreementButton partnerId={params.partnerId} agreementId={agreement.id} label={recordLabel} />}
                </div>
              </div>
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
