"use server";

import { revalidatePath } from "next/cache";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { createWholesaleProduct, updateWholesaleProduct, rupeesToPaise } from "@/lib/wholesaleData";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";

export async function saveWholesaleProductAction(partnerId: string, formData: FormData) {
  const session = await requirePartnerSessionForPage(partnerId);
  if (session.kind === "staff") throw new Error("Only the distributor owner can manage catalogue prices.");
  const productId = String(formData.get("productId") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "unit").trim() || "unit";
  const price = Number(formData.get("listPrice") ?? 0);
  const gstPercent = Number(formData.get("gstPercent") ?? 0);
  const minimumQuantity = Number(formData.get("minimumQuantity") ?? 1);
  const inventoryMaterialId = String(formData.get("inventoryMaterialId") ?? "").trim();
  const isActive = formData.get("isActive") === "on";
  if (!sku || sku.length > 40 || !name || name.length > 160) throw new Error("Enter a valid SKU and product name.");
  if (!Number.isFinite(price) || price < 0 || price > 100000000 || !Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) throw new Error("Enter a valid product price and GST rate.");
  if (!Number.isFinite(minimumQuantity) || minimumQuantity <= 0 || minimumQuantity > 100000) throw new Error("Minimum order quantity must be greater than zero.");
  const material = (await getBomOptionsForPartner(partnerId)).find((item) => item.value === inventoryMaterialId);
  if (!material) throw new Error("Choose a valid inventory material for this product.");
  if (material.serialized && !Number.isInteger(minimumQuantity)) throw new Error("A serialized product must use a whole-number minimum quantity.");
  const input = {
    sku, name, description: String(formData.get("description") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null, unit,
    listPrice: rupeesToPaise(price), gstRateBps: Math.round(gstPercent * 100), minimumQuantity,
    inventoryMaterialId, barcode: String(formData.get("barcode") ?? "").trim() || null,
    serialized: material.serialized, isActive,
  };
  if (productId) await updateWholesaleProduct(partnerId, productId, input);
  else await createWholesaleProduct(partnerId, input);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/catalog`);
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/new`);
}
