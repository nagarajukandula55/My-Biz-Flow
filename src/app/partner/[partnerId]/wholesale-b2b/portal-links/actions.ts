"use server";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createDealerPortalToken } from "@/lib/dealerPortal";
import { redirect } from "next/navigation";
export async function createDealerPortalLinkAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); const customerId = String(formData.get("customerId") ?? ""); const token = await createDealerPortalToken({ partnerId, customerId }); redirect(`/partner/${partnerId}/wholesale-b2b/portal-links?link=${encodeURIComponent(`/dealer-portal/${token}`)}`); }
