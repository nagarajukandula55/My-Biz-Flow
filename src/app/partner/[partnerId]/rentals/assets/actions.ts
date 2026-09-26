"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createAsset, updateAsset } from "@/lib/rentals";

export async function createAssetAction(
  partnerId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  partnerId = await requireSessionPartnerId(partnerId);
  const assetName = String(values["assetName"] ?? "").trim();
  if (!assetName) return { error: "Asset / venue name is required." };
  const asset = await createAsset(partnerId, {
    assetName,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  });
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
  await updateAsset(partnerId, assetId, {
    assetName,
    isActive: values["isActive"] === undefined ? true : Boolean(values["isActive"]),
  });
  revalidatePath(`/partner/${partnerId}/rentals/assets`);
  revalidatePath(`/partner/${partnerId}/rentals/assets/${assetId}`);
  redirect(`/partner/${partnerId}/rentals/assets/${assetId}`);
}
