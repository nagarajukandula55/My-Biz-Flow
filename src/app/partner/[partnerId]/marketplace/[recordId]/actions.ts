"use server";

import { revalidatePath } from "next/cache";
import { createBusinessRecord, getBusinessRecord, updateBusinessRecord } from "@/lib/businessRecords";
import { computeCommission, PAYOUT_STAGES, type MarketplaceOrder } from "@/lib/sample-data/marketplace";

/** Creates a new order under a vendor listing — commission is always computed server-side from the vendor's own rate, never trusting a client total. */
export async function createOrderForVendorAction(
  partnerId: string,
  vendorId: string,
  saleAmount: number
): Promise<{ error?: string }> {
  if (!(saleAmount > 0)) return { error: "Enter a sale amount greater than zero." };
  const vendor = await getBusinessRecord(partnerId, "marketplace", vendorId);
  if (!vendor) return { error: "Vendor listing not found." };

  const commissionRate = Number(vendor["commissionRate"] ?? 0);
  const { commissionAmount, vendorPayoutAmount } = computeCommission(saleAmount, commissionRate);

  const order: Omit<MarketplaceOrder, "id"> = {
    recordKind: "order",
    vendorId,
    vendorName: String(vendor["partnerName"] ?? vendorId),
    saleAmount,
    commissionRate,
    commissionAmount,
    vendorPayoutAmount,
    payoutStatus: "Pending",
    createdAt: new Date().toISOString(),
  };

  await createBusinessRecord(partnerId, "marketplace", order);
  revalidatePath(`/partner/${partnerId}/marketplace/${vendorId}`);
  revalidatePath(`/partner/${partnerId}/marketplace`);
  return {};
}

/** Advances an order's payout status Pending -> Processing -> Paid, recording a payout date once Paid. */
export async function advancePayoutStatusAction(partnerId: string, orderId: string): Promise<void> {
  const record = await getBusinessRecord(partnerId, "marketplace", orderId);
  if (!record || record["recordKind"] !== "order") return;
  const idx = PAYOUT_STAGES.indexOf(record["payoutStatus"] as (typeof PAYOUT_STAGES)[number]);
  const next = PAYOUT_STAGES[idx + 1];
  if (!next) return;

  await updateBusinessRecord(partnerId, "marketplace", orderId, {
    ...record,
    payoutStatus: next,
    payoutDate: next === "Paid" ? new Date().toISOString().slice(0, 10) : record["payoutDate"],
  });
  revalidatePath(`/partner/${partnerId}/marketplace/${orderId}`);
  revalidatePath(`/partner/${partnerId}/marketplace/${String(record["vendorId"])}`);
}
