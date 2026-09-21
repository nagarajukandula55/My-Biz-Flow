"use server";

import { revalidatePath } from "next/cache";
import { requirePosStaffAction } from "@/lib/pos/posAuth";
import { openTillSession, closeTillSession } from "@/lib/pos/posTill";

export async function openTillSessionAction(
  partnerId: string,
  formData: FormData
): Promise<void | { error?: string }> {
  const staff = await requirePosStaffAction(partnerId);
  const locationId = String(formData.get("locationId") ?? "").trim();
  const openingFloat = Number(formData.get("openingFloat") ?? 0);

  if (!locationId) return { error: "Choose an outlet." };
  if (!Number.isFinite(openingFloat) || openingFloat < 0) return { error: "Enter a valid opening cash float." };

  try {
    await openTillSession({ posAccountId: staff.posAccountId, locationId, openedByStaffId: staff.id, openingFloat });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not open till." };
  }

  revalidatePath(`/partner/${partnerId}/pos/till`);
}

export async function closeTillSessionAction(
  partnerId: string,
  formData: FormData
): Promise<void | { error?: string }> {
  const staff = await requirePosStaffAction(partnerId);
  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const countedCash = Number(formData.get("countedCash") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();

  if (!sessionId) return { error: "No session to close." };
  if (!Number.isFinite(countedCash) || countedCash < 0) return { error: "Enter the counted cash amount." };

  try {
    await closeTillSession({ partnerId, sessionId, closedByStaffId: staff.id, countedCash, notes });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not close till." };
  }

  revalidatePath(`/partner/${partnerId}/pos/till`);
  revalidatePath(`/partner/${partnerId}/pos/checkout`);
}
