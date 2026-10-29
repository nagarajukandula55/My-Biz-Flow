"use server";

import { createBusinessRecord } from "@/lib/businessRecords";
import { listBusinessRecords } from "@/lib/businessRecords";
import { verifyCustomerPortalToken } from "@/lib/customerPortal";

export async function submitCustomerPortalRequest(token: string, formData: FormData) {
  const claims = await verifyCustomerPortalToken(token);
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!subject || !message || subject.length > 160 || message.length > 4000) throw new Error("Enter a subject and message within the allowed length.");
  await createBusinessRecord(claims.partnerId, "customer-portal-request", { customer: claims.customer, subject, message, status: "Open", source: "customer-portal", createdAt: new Date().toISOString() });
}

export async function submitInteriorSelectionResponse(token: string, formData: FormData) { const claims = await verifyCustomerPortalToken(token); const selectionId = String(formData.get("selectionId") ?? "").trim(); const response = String(formData.get("response") ?? "").trim(); const note = String(formData.get("note") ?? "").trim(); if (!selectionId || !["Confirmed", "Change requested"].includes(response) || !note || note.length > 2000) throw new Error("Choose a valid response and enter a note within 2,000 characters."); const [selections, projects] = await Promise.all([listBusinessRecords(claims.partnerId, "interior-selection"), listBusinessRecords(claims.partnerId, "interior-design")]); const selection = selections.find(item => String(item.id) === selectionId); const project = selection && projects.find(item => String(item.id) === String(selection.projectId) && String(item.customer ?? "").toLowerCase() === claims.customer.toLowerCase()); if (!selection || !project) throw new Error("Selection is not available for this customer."); await createBusinessRecord(claims.partnerId, "interior-selection-response", { selectionId, projectId: selection.projectId, customer: claims.customer, response, note, createdAt: new Date().toISOString(), source: "customer-portal" }); }
