"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { prisma } from "@/lib/prisma";
import { getWarehouseOptionsForPartner } from "@/lib/sample-data/warehouse";
import { receiveWholesaleOrderForDealer } from "@/lib/wholesaleFulfillment";
import { createDealerReferralToken } from "@/lib/dealerPortal";
import { getWholesaleReferralProgram } from "@/lib/wholesaleReferrals";
import { SITE_URL } from "@/lib/seo";

export async function receiveDealerPurchaseAction(dealerPartnerId: string, orderId: string, formData: FormData) {
  dealerPartnerId = await requireSessionPartnerId(dealerPartnerId);
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const warehouse = (await getWarehouseOptionsForPartner(dealerPartnerId)).find((item) => item.value === warehouseId);
  if (!warehouse) throw new Error("Choose a valid dealer warehouse.");
  await receiveWholesaleOrderForDealer(dealerPartnerId, orderId, { warehouseId, warehouseName: warehouse.label }, { type: "Dealer", id: dealerPartnerId });
  revalidatePath(`/partner/${dealerPartnerId}/wholesale-b2b/purchases`);
  revalidatePath(`/partner/${dealerPartnerId}/inventory/stock`);
}

export async function createMyDealerReferralLinkAction(dealerPartnerId: string) {
  dealerPartnerId = await requireSessionPartnerId(dealerPartnerId);
  const relationship = await prisma.distributorDealerRelationship.findUnique({ where: { dealerPartnerId } });
  if (!relationship || relationship.status !== "Active") throw new Error("No active distributor relationship was found.");
  const program = await getWholesaleReferralProgram(relationship.distributorPartnerId);
  if (!program?.enabled || !program.dealerPartnerTypeId) throw new Error("The distributor has not enabled dealer referral rewards.");
  const token = await createDealerReferralToken({ partnerId: relationship.distributorPartnerId, referrerCustomerId: relationship.wholesaleCustomerId, partnerTypeId: program.dealerPartnerTypeId });
  const link = `${SITE_URL}/dealer-portal/refer/${token}`;
  redirect(`/partner/${dealerPartnerId}/wholesale-b2b/purchases?referral=${encodeURIComponent(link)}`);
}
