"use server";

import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createSupportTicket, setSupportTicketStatus } from "@/lib/supportTickets";

/** Submits a new support ticket from the floating Support widget on any partner page. */
export async function submitSupportTicketAction(partnerId: string, formData: FormData): Promise<void> {
  await requireSessionPartnerId(partnerId);
  const message = String(formData.get("message") ?? "").trim();
  if (!message) throw new Error("Please enter a message before sending.");
  await createSupportTicket(partnerId, message);
  revalidatePath(`/partner/${partnerId}`, "layout");
}

/** Super Admin: mark a ticket resolved/reopen it, from /admin/support-tickets. */
export async function setSupportTicketStatusAction(formData: FormData): Promise<void> {
  const partnerId = String(formData.get("partnerId") ?? "").trim();
  const ticketId = String(formData.get("ticketId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!partnerId || !ticketId || (status !== "open" && status !== "resolved")) {
    throw new Error("Partner, ticket and a valid status are required");
  }
  await setSupportTicketStatus(partnerId, ticketId, status);
  revalidatePath("/admin/support-tickets");
}
