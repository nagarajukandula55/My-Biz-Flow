"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createTrip,
  updateTrip,
  deleteTrip,
  assignTripDriverVehicle,
  advanceTripDeliveryStage,
  type DeliveryStage,
} from "@/lib/logisticsFleet";

function toInput(values: Record<string, unknown>) {
  return {
    vehicleId: values["vehicleId"] ? String(values["vehicleId"]) : undefined,
    driverId: values["driverId"] ? String(values["driverId"]) : undefined,
    origin: String(values["origin"] ?? "").trim(),
    destination: String(values["destination"] ?? "").trim(),
    currentLatitude: values["currentLatitude"] !== undefined && values["currentLatitude"] !== "" ? Number(values["currentLatitude"]) : undefined,
    currentLongitude: values["currentLongitude"] !== undefined && values["currentLongitude"] !== "" ? Number(values["currentLongitude"]) : undefined,
    deliveryEta: values["deliveryEta"] ? new Date(String(values["deliveryEta"])) : undefined,
  };
}

/** Bind with .bind(null, partnerId) before passing as RecordForm's `action` prop. */
export async function createTripAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.origin) return { error: "Origin is required." };
  if (!input.destination) return { error: "Destination is required." };

  const trip = await createTrip(partnerId, input);
  revalidatePath(`/partner/${partnerId}/logistics-fleet`);
  redirect(`/partner/${partnerId}/logistics-fleet/${trip.id}`);
}

/** Bind with .bind(null, partnerId, tripId). */
export async function updateTripAction(
  partnerId: string,
  tripId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const input = toInput(values);
  if (!input.origin) return { error: "Origin is required." };
  if (!input.destination) return { error: "Destination is required." };

  await updateTrip(partnerId, tripId, input);
  revalidatePath(`/partner/${partnerId}/logistics-fleet`);
  revalidatePath(`/partner/${partnerId}/logistics-fleet/${tripId}`);
  redirect(`/partner/${partnerId}/logistics-fleet/${tripId}`);
}

export async function deleteTripAction(partnerId: string, tripId: string): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await deleteTrip(partnerId, tripId);
  revalidatePath(`/partner/${partnerId}/logistics-fleet`);
  redirect(`/partner/${partnerId}/logistics-fleet`);
}

/** Assigns driver + vehicle to a trip — assignedAt is stamped server-side. */
export async function assignDriverAction(
  partnerId: string,
  tripId: string,
  driverId: string,
  driverName: string,
  vehicleId?: string
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await assignTripDriverVehicle(partnerId, tripId, driverId, driverName, vehicleId);
  revalidatePath(`/partner/${partnerId}/logistics-fleet/${tripId}`);
}

/**
 * Advances the delivery stage, stamping the transition's timestamp
 * server-side. A transition into Delivered requires recipient name + proof
 * notes — the caller (DeliveryLifecycle) enforces the UI gate, but this is
 * re-checked here since it's the actual write path and the client's gate
 * must never be trusted alone.
 */
export async function advanceDeliveryStageAction(
  partnerId: string,
  tripId: string,
  nextStage: DeliveryStage,
  proof?: { recipientName: string; deliveryNotes: string },
  failureReason?: string
): Promise<void> {
  partnerId = await requireSessionPartnerId(partnerId);
  await advanceTripDeliveryStage(partnerId, tripId, nextStage, proof, failureReason);
  revalidatePath(`/partner/${partnerId}/logistics-fleet/${tripId}`);
}
