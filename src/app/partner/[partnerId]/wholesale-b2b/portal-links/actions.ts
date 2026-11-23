"use server";
import { requirePartnerSessionForPage, requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createDealerPortalToken } from "@/lib/dealerPortal";
import { redirect } from "next/navigation";
import { updateBusinessRecord } from "@/lib/businessRecords";
import { revalidatePath } from "next/cache";
import { runWorkflowAutomations } from "@/lib/workflowAutomation";
import { createDealerReferralToken } from "@/lib/dealerPortal";
import { SITE_URL } from "@/lib/seo";
import { getWholesaleCustomer } from "@/lib/wholesaleData";
import { getWholesaleReferralProgram, saveWholesaleReferralProgram } from "@/lib/wholesaleReferrals";
export async function createDealerPortalLinkAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); const customerId = String(formData.get("customerId") ?? ""); const token = await createDealerPortalToken({ partnerId, customerId }); redirect(`/partner/${partnerId}/wholesale-b2b/portal-links?link=${encodeURIComponent(`/dealer-portal/${token}`)}`); }
export async function createDealerReferralLinkAction(partnerId: string, formData: FormData) {
  const session = await requirePartnerSessionForPage(partnerId);
  if (session.kind === "staff") throw new Error("Only the distributor owner can create dealer referral links.");
  const customerId = String(formData.get("customerId") ?? "");
  const customer = await getWholesaleCustomer(partnerId, customerId);
  if (!customer?.isActive) throw new Error("Choose an active dealer account.");
  const program = await getWholesaleReferralProgram(partnerId);
  if (!program?.dealerPartnerTypeId) throw new Error("Configure the dealer business type and eligible subscription plan before creating referral links.");
  const token = await createDealerReferralToken({ partnerId, referrerCustomerId: customer.id, partnerTypeId: program.dealerPartnerTypeId });
  const link = `${SITE_URL}/dealer-portal/refer/${token}`;
  redirect(`/partner/${partnerId}/wholesale-b2b/portal-links?referral=${encodeURIComponent(link)}`);
}
export async function createDirectDealerInviteAction(partnerId: string) {
  const session = await requirePartnerSessionForPage(partnerId);
  if (session.kind === "staff") throw new Error("Only the distributor owner can create dealer invitations.");
  const program = await getWholesaleReferralProgram(partnerId);
  if (!program?.dealerPartnerTypeId) throw new Error("Configure the dealer business type and eligible plan first.");
  const token = await createDealerReferralToken({ partnerId, partnerTypeId: program.dealerPartnerTypeId });
  const link = `${SITE_URL}/dealer-portal/refer/${token}`;
  redirect(`/partner/${partnerId}/wholesale-b2b/portal-links?referral=${encodeURIComponent(link)}`);
}
export async function updateDealerOrderRequestAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); const id = String(formData.get("requestId") ?? ""); const status = String(formData.get("status") ?? ""); if (!id || !["Open", "Reviewing", "Quoted", "Accepted", "Declined"].includes(status)) throw new Error("Invalid dealer request update."); const records = await import("@/lib/businessRecords").then(m => m.listBusinessRecords(partnerId, "dealer-order-request")); const record = records.find(row => String(row.id) === id); if (!record) throw new Error("Dealer request not found."); await updateBusinessRecord(partnerId, "dealer-order-request", id, { ...record, status, updatedAt: new Date().toISOString() }); if (status === "Accepted" && String(record.status) !== "Accepted") await runWorkflowAutomations(partnerId, { trigger: "dealer.order-request-accepted", moduleSlug: "wholesale-b2b", recordId: id, record: { ...record, status } }); revalidatePath(`/partner/${partnerId}/wholesale-b2b/portal-links/requests`); }

export async function saveDealerReferralProgramAction(partnerId: string, formData: FormData) {
  const session = await requirePartnerSessionForPage(partnerId);
  if (session.kind === "staff") throw new Error("Only the distributor owner can configure referral rewards.");
  await saveWholesaleReferralProgram(partnerId, {
    enabled: formData.get("enabled") === "on",
    dealerPartnerTypeId: String(formData.get("dealerPartnerTypeId") ?? ""),
  });
  revalidatePath(`/partner/${partnerId}/wholesale-b2b/referrals`);
}
