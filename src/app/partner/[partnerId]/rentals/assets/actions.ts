"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createAsset, updateAsset, scheduleMaintenance, removeMaintenance } from "@/lib/rentals";
import { readRentalAssetPolicy } from "@/lib/rentalAssetPolicy";

export async function maintenanceAction(partnerId: string, assetId: string, remove: boolean, values: Record<string, unknown>) {
  await requireSessionPartnerId(partnerId);
  try {
    if (remove) await removeMaintenance(partnerId, assetId, String(values.start ?? ""));
    else await scheduleMaintenance(partnerId, assetId, { maintenanceStart: values.scheduleStart, maintenanceEnd: values.scheduleEnd, maintenanceNotes: values.scheduleNotes });
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not update maintenance." }; }
  revalidatePath(`/partner/${partnerId}/rentals/assets/${assetId}`);
}

export async function createAssetAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const assetName = String(values["assetName"] ?? "").trim();
  if (!assetName) return { error: "Asset / venue name is required." };
  let asset;
  try { asset = await createAsset(partnerId, {
    assetName,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
    policy: readRentalAssetPolicy(values),
  }); } catch (error) { return { error: error instanceof Error ? error.message : "Could not save asset." }; }
  revalidatePath(`/partner/${partnerId}/rentals/assets`);
  redirect(`/partner/${partnerId}/rentals/assets/${asset.id}`);
}

export async function updateAssetAction(
  partnerId: string,
  assetId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const assetName = String(values["assetName"] ?? "").trim();
  if (!assetName) return { error: "Asset / venue name is required." };
  try { await updateAsset(partnerId, assetId, {
    assetName,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
    policy: readRentalAssetPolicy(values),
  }); } catch (error) { return { error: error instanceof Error ? error.message : "Could not save asset." }; }
  revalidatePath(`/partner/${partnerId}/rentals/assets`);
  revalidatePath(`/partner/${partnerId}/rentals/assets/${assetId}`);
  redirect(`/partner/${partnerId}/rentals/assets/${assetId}`);
}
