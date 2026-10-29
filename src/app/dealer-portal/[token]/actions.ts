"use server";

import { createBusinessRecord } from "@/lib/businessRecords";
import { verifyDealerPortalToken } from "@/lib/dealerPortal";

export async function submitDealerOrderRequest(token: string, formData: FormData) {
  const claims = await verifyDealerPortalToken(token);
  const material = String(formData.get("material") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();
  if (!material || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100000 || notes.length > 2000) throw new Error("Enter a valid material, quantity and notes.");
  await createBusinessRecord(claims.partnerId, "dealer-order-request", { customerId: claims.customerId, material, quantity, notes, status: "Open", source: "dealer-portal", createdAt: new Date().toISOString() });
}
