"use server";

import { readRentalTerms, rentalQuote, rentalLineAmount } from "@/lib/rentalTerms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { recordRentalPayment, reverseRentalPayment } from "@/lib/rentalPayments";
import { recordRentalUnitMovement } from "@/lib/rentalUnitOperations";

export async function rentalUnitMovementAction(partnerId: string, agreementId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  try { await recordRentalUnitMovement(partnerId, agreementId, values); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not record unit movement." }; }
  revalidatePath(`/partner/${partnerId}/rentals`, "layout");
  redirect(`/partner/${partnerId}/rentals/${agreementId}`);
}

export async function rentalPaymentCorrectionAction(partnerId: string, agreementId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  try { await reverseRentalPayment(partnerId, agreementId, values); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not correct payment record." }; }
  revalidatePath(`/partner/${partnerId}/rentals/${agreementId}`);
  redirect(`/partner/${partnerId}/rentals/${agreementId}`);
}

export async function rentalPaymentAction(partnerId: string, agreementId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  try { await recordRentalPayment(partnerId, agreementId, values); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not record payment." }; }
  revalidatePath(`/partner/${partnerId}/rentals/${agreementId}`);
  redirect(`/partner/${partnerId}/rentals/${agreementId}`);
}
import {
  createAgreement,
  createAgreementBatch,
  recordRentalPickup,
  updateAgreement,
  deleteAgreement,
  returnAsset,
  type RentalAgreementStatus,
} from "@/lib/rentals";

function rentalDate(value:unknown) {
  const text=String(value??'');
  return new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)?text+':00+05:30':text);
}

export async function pickupAction(partnerId: string, agreementId: string, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  try { await recordRentalPickup(partnerId, agreementId, values); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not record pickup." }; }
  revalidatePath(`/partner/${partnerId}/rentals`, "layout");
}
function toInput(values: Record<string, unknown>) {
  return {
    terms: readRentalTerms(values),
    assetId: values["assetId"] ? String(values["assetId"]) : undefined,
    assetName: String(values["assetName"] ?? "").trim(),
    renter: String(values["renter"] ?? "").trim(),
    bookingStart: rentalDate(values["bookingStart"]),
    bookingEnd: rentalDate(values["bookingEnd"]),
    depositAmount: Math.round(Number(values["depositAmountRupees"] ?? 0) * 100),
    rentalAmount: Math.round(Number(values["rentalAmountRupees"] ?? 0) * 100),
    status: values["status"] ? (String(values["status"]) as RentalAgreementStatus) : undefined,
  };
}

function conflictMessage(conflict: { renter: string; bookingStart: Date; bookingEnd: Date }): string {
  return `There are not enough available units for this booking. An overlapping reservation is for ${conflict.renter} (${conflict.bookingStart.toLocaleDateString(
    "en-IN"
  )} - ${conflict.bookingEnd.toLocaleDateString("en-IN")}). Reduce the quantity or choose different dates.`;
}

/**
 * Bind with .bind(null, partnerId) before passing as RecordForm's `action`
 * prop — the return shape (`void | { error }`) matches RecordFormAction
 * exactly; a successful save redirects and never returns.
 */
export async function createAgreementAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  let input: ReturnType<typeof toInput>;
  try { input = toInput(values); input.rentalAmount = rentalQuote(input.terms,input.bookingStart,input.bookingEnd,input.rentalAmount); if(!Number.isSafeInteger(input.depositAmount)||input.depositAmount<0||input.depositAmount>2147483647)throw new Error("Enter a valid deposit amount."); } catch(error) { return {error:error instanceof Error?error.message:"Check the rental details."}; }
  if (!input.assetName) return { error: "Asset / venue name is required." };
  if (!input.renter) return { error: "Renter is required." };
  if (Number.isNaN(input.bookingStart.getTime()) || Number.isNaN(input.bookingEnd.getTime())) {
    return { error: "Booking start and end dates are required." };
  }

  let result;
  try {
    const extra = values.additionalAssetIds;
    if (extra !== undefined && (!Array.isArray(extra) || !extra.every(id => typeof id === "string"))) return { error: "Select valid additional assets." };
    if (Array.isArray(extra) && extra.length) {
      const batch = await createAgreementBatch(partnerId, [input, ...extra.map(assetId => ({ ...input, assetId: String(assetId), assetName: "",
        depositAmount: rentalLineAmount(values, String(assetId), "deposit", input.depositAmount),
        rentalAmount: rentalLineAmount(values, String(assetId), "fixed", input.rentalAmount),
        terms: { ...input.terms, quantity: values[`line:${assetId}:quantity`] === undefined || values[`line:${assetId}:quantity`] === "" ? input.terms.quantity : Number(values[`line:${assetId}:quantity`]), ratePaise: rentalLineAmount(values, String(assetId), "rate", input.terms.ratePaise) },
      }))]);
      result = { ok: true as const, id: batch.id };
    } else result = await createAgreement(partnerId, input);
  }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not create booking." }; }
  if (!result.ok) return { error: conflictMessage(result.conflict) };

  revalidatePath(`/partner/${partnerId}/rentals`);
  if (input.assetId) revalidatePath(`/partner/${partnerId}/rentals/assets/${input.assetId}`);
  redirect(`/partner/${partnerId}/rentals/${result.id}`);
}

/** Bind with .bind(null, partnerId, agreementId). */
export async function updateAgreementAction(
  partnerId: string,
  agreementId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  let input: ReturnType<typeof toInput>;
  try { input = toInput(values); }
  catch (error) { return { error: error instanceof Error ? error.message : "Check the booking details." }; }
  if (!input.assetName) return { error: "Asset / venue name is required." };
  if (!input.renter) return { error: "Renter is required." };
  if (Number.isNaN(input.bookingStart.getTime()) || Number.isNaN(input.bookingEnd.getTime())) {
    return { error: "Booking start and end dates are required." };
  }

  let result;
  try { result = await updateAgreement(partnerId, agreementId, input); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not update booking." }; }
  if (!result.ok) return { error: conflictMessage(result.conflict) };

  revalidatePath(`/partner/${partnerId}/rentals`);
  revalidatePath(`/partner/${partnerId}/rentals/${agreementId}`);
  if (input.assetId) revalidatePath(`/partner/${partnerId}/rentals/assets/${input.assetId}`);
  redirect(`/partner/${partnerId}/rentals/${agreementId}`);
}

export async function deleteAgreementAction(partnerId: string, agreementId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await deleteAgreement(partnerId, agreementId);
  revalidatePath(`/partner/${partnerId}/rentals`);
  redirect(`/partner/${partnerId}/rentals`);
}

/**
 * Records asset return: staff enters a damage charge (deducted from the
 * deposit), and refundableAmount = depositAmount - damageCharge is
 * computed server-side, clamped to >= 0 — never trusts a client-submitted
 * refundableAmount. `damageChargeRupees` is converted to paise here.
 */
export async function returnAssetAction(
  partnerId: string,
  agreementId: string,
  damageChargeRupees: number,
  returnNotes?: string
): Promise<{ ok: boolean; refundableAmount?: number; message?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const damageCharge = Math.round(Number(damageChargeRupees) * 100);
  let result;
  try { result = await returnAsset(partnerId, agreementId, damageCharge, returnNotes); }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not record return." }; }
  if (!result.ok) return result;
  revalidatePath(`/partner/${partnerId}/rentals/${agreementId}`);
  revalidatePath(`/partner/${partnerId}/rentals`);
  return { ok: true, refundableAmount: result.refundableAmount / 100 };
}
