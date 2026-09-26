"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createAgreement,
  updateAgreement,
  deleteAgreement,
  returnAsset,
  type RentalAgreementStatus,
} from "@/lib/rentals";

function toInput(values: Record<string, unknown>) {
  return {
    assetId: values["assetId"] ? String(values["assetId"]) : undefined,
    assetName: String(values["assetName"] ?? "").trim(),
    renter: String(values["renter"] ?? "").trim(),
    bookingStart: new Date(String(values["bookingStart"] ?? "")),
    bookingEnd: new Date(String(values["bookingEnd"] ?? "")),
    depositAmount: Math.round((Number(values["depositAmountRupees"]) || 0) * 100),
    rentalAmount: Math.round((Number(values["rentalAmountRupees"]) || 0) * 100),
    status: values["status"] ? (String(values["status"]) as RentalAgreementStatus) : undefined,
  };
}

function conflictMessage(conflict: { renter: string; bookingStart: Date; bookingEnd: Date }): string {
  return `This asset is already booked for ${conflict.renter} over an overlapping date range (${conflict.bookingStart.toLocaleDateString(
    "en-IN"
  )} - ${conflict.bookingEnd.toLocaleDateString("en-IN")}). Choose different dates.`;
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
  const input = toInput(values);
  if (!input.assetName) return { error: "Asset / venue name is required." };
  if (!input.renter) return { error: "Renter is required." };
  if (Number.isNaN(input.bookingStart.getTime()) || Number.isNaN(input.bookingEnd.getTime())) {
    return { error: "Booking start and end dates are required." };
  }

  const result = await createAgreement(partnerId, input);
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
  const input = toInput(values);
  if (!input.assetName) return { error: "Asset / venue name is required." };
  if (!input.renter) return { error: "Renter is required." };
  if (Number.isNaN(input.bookingStart.getTime()) || Number.isNaN(input.bookingEnd.getTime())) {
    return { error: "Booking start and end dates are required." };
  }

  const result = await updateAgreement(partnerId, agreementId, input);
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
  const damageCharge = Math.round((Number(damageChargeRupees) || 0) * 100);
  const result = await returnAsset(partnerId, agreementId, damageCharge, returnNotes);
  if (!result.ok) return result;
  revalidatePath(`/partner/${partnerId}/rentals/${agreementId}`);
  revalidatePath(`/partner/${partnerId}/rentals`);
  return { ok: true, refundableAmount: result.refundableAmount / 100 };
}
