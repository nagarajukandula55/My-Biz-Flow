"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { getPartner } from "@/lib/partnerData";
import { sendPartnerSupportMessage, appendSupportReply, getOpenSupportTicket, setSupportTicketStatus, type SupportTicketRecord } from "@/lib/supportTickets";

/** Sends a message from the floating Support widget — live chat, not a one-shot ticket. */
export async function sendSupportMessageAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);
  const message = String(formData.get("message") ?? "").trim();
  if (!message) throw new Error("Please enter a message before sending.");
  const partner = await getPartner(partnerId);
  await sendPartnerSupportMessage(partnerId, partner?.businessName ?? partnerId, message);
  revalidatePath(`/partner/${partnerId}`, "layout");
}

/** Polled by the widget while open, so a reply typed in Telegram (by a human or a bot) shows up without a page reload. */
export async function getSupportThreadAction(partnerId: string): Promise<SupportTicketRecord | undefined> {
  await requireSessionPartnerId(partnerId);
  return getOpenSupportTicket(partnerId);
}

/** Super Admin: reply inline from the admin support-tickets page (same effect as replying in Telegram). */
export async function appendSupportReplyAction(formData: FormData): Promise<void> {
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!partnerId || !ticketId || !text) throw new Error("Partner, ticket and a message are required");
  await appendSupportReply(partnerId, ticketId, text);
  revalidatePath("/admin/support-tickets");
}

/** Super Admin: mark a ticket resolved/reopen it, from /admin/support-tickets. */
export async function setSupportTicketStatusAction(formData: FormData): Promise<void> {
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!partnerId || !ticketId || (status !== "open" && status !== "resolved")) {
    throw new Error("Partner, ticket and a valid status are required");
  }
  await setSupportTicketStatus(partnerId, ticketId, status as "open" | "resolved");
  revalidatePath("/admin/support-tickets");
}
