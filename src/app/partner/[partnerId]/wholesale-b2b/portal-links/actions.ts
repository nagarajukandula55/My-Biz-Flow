"use server";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createDealerPortalToken } from "@/lib/dealerPortal";
import { redirect } from "next/navigation";
import { updateBusinessRecord } from "@/lib/businessRecords";
import { revalidatePath } from "next/cache";
export async function createDealerPortalLinkAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); const customerId = String(formData.get("customerId") ?? ""); const token = await createDealerPortalToken({ partnerId, customerId }); redirect(`/partner/${partnerId}/wholesale-b2b/portal-links?link=${encodeURIComponent(`/dealer-portal/${token}`)}`); }
export async function updateDealerOrderRequestAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); const id = String(formData.get("requestId") ?? ""); const status = String(formData.get("status") ?? ""); if (!id || !["Open", "Reviewing", "Quoted", "Accepted", "Declined"].includes(status)) throw new Error("Invalid dealer request update."); const records = await import("@/lib/businessRecords").then(m => m.listBusinessRecords(partnerId, "dealer-order-request")); const record = records.find(row => String(row.id) === id); if (!record) throw new Error("Dealer request not found."); await updateBusinessRecord(partnerId, "dealer-order-request", id, { ...record, status, updatedAt: new Date().toISOString() }); revalidatePath(`/partner/${partnerId}/wholesale-b2b/portal-links/requests`); }
