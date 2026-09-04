"use server";

import { revalidatePath } from "next/cache";
import { updateBusinessRecord, getBusinessRecord } from "@/lib/businessRecords";
import type { DeliveryStage } from "@/lib/sample-data/logistics-fleet";

/** Assigns driver + vehicle to a shipment — assignedAt is stamped server-side. */
export async function assignDriverAction(
  partnerId: string,
  shipmentId: string,
  driverId: string,
  driverName: string,
  vehicleNumber?: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "logistics-fleet", shipmentId);
  if (!record) return;
  await updateBusinessRecord(partnerId, "logistics-fleet", shipmentId, {
    ...record,
    driverId,
    driverName,
    vehicleNumber: vehicleNumber ?? record["vehicleNumber"],
    assignedAt: new Date().toISOString(),
  });
  revalidatePath(`/partner/${partnerId}/logistics-fleet/${shipmentId}`);
}

const STAGE_TIMESTAMP_FIELD: Record<DeliveryStage, string> = {
  Pending: "pendingAt",
  "Out for Delivery": "outForDeliveryAt",
  Delivered: "deliveredAt",
  Failed: "failedAt",
};

/**
 * Advances the delivery stage, stamping the transition's timestamp
 * server-side. A transition into Delivered requires recipient name + proof
 * notes — the caller (DeliveryLifecycle) enforces the UI gate, but this is
 * re-checked here since it's the actual write path and the client's gate
 * must never be trusted alone.
 */
export async function advanceDeliveryStageAction(
  partnerId: string,
  shipmentId: string,
  nextStage: DeliveryStage,
  proof?: { recipientName: string; deliveryNotes: string },
  failureReason?: string
): Promise<void> {
  const record = await getBusinessRecord(partnerId, "logistics-fleet", shipmentId);
  if (!record) return;

  if (nextStage === "Delivered") {
    if (!proof?.recipientName?.trim()) return; // refuse silently — the client validates too, this is the real gate
  }

  await updateBusinessRecord(partnerId, "logistics-fleet", shipmentId, {
    ...record,
    deliveryStage: nextStage,
    [STAGE_TIMESTAMP_FIELD[nextStage]]: new Date().toISOString(),
    ...(nextStage === "Delivered" && proof
      ? { recipientName: proof.recipientName, deliveryNotes: proof.deliveryNotes }
      : {}),
    ...(nextStage === "Failed" && failureReason ? { failureReason } : {}),
  });
  revalidatePath(`/partner/${partnerId}/logistics-fleet/${shipmentId}`);
}
