"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import {
  createMarketplaceOrder,
  updateMarketplaceOrderStatus,
  paiseToRupees,
  type MarketplaceOrderStatusValue,
} from "@/lib/marketplace";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import { marketplaceNewOrderMessage } from "@/lib/telegramTemplates";

export async function createMarketplaceOrderAction(
  partnerId: string,
  values: { listingId: string; customerName: string; customerContact?: string; quantity: number }
): Promise<{ error?: string } | void> {
  partnerId = await requireSessionPartnerId(partnerId);

  const listingId = String(values.listingId ?? "").trim();
  if (!listingId) return { error: "Listing is required." };

  const result = await createMarketplaceOrder(partnerId, {
    listingId,
    customerName: String(values.customerName ?? ""),
    customerContact: values.customerContact,
    quantity: Number(values.quantity) || 1,
  });
  if ("error" in result) return { error: result.error };

  // "marketplaceNewOrder" -- wired live: fires right after a new order is
  // successfully created, notifying the vendor/partner. See
  // src/lib/telegram.ts's TELEGRAM_ALERT_TYPES for the type key and
  // "marketplaceVendorPayout" sitting next to it as a type-key-only entry
  // (no real payout/settlement mechanism exists yet — not built here).
  const partner = await getPartner(partnerId);
  if (partner) {
    const message = await marketplaceNewOrderMessage({
      partnerBusinessName: partner.businessName,
      listingTitle: result.order.listingTitle,
      quantity: result.order.quantity,
      customerName: result.order.customerName,
      totalAmount: `₹${paiseToRupees(result.order.totalAmount)}`,
    });
    await sendPartnerTelegramAlert(partnerId, "marketplaceNewOrder", message);
  }

  revalidatePath(`/partner/${partnerId}/marketplace/orders`);
  redirect(`/partner/${partnerId}/marketplace/orders/${result.order.id}`);
}

export async function updateMarketplaceOrderStatusAction(
  partnerId: string,
  orderId: string,
  status: MarketplaceOrderStatusValue
): Promise<{ error?: string } | void> {
  partnerId = await requireSessionPartnerId(partnerId);
  const result = await updateMarketplaceOrderStatus(partnerId, orderId, status);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/partner/${partnerId}/marketplace/orders`);
  revalidatePath(`/partner/${partnerId}/marketplace/orders/${orderId}`);
}
