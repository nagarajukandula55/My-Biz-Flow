"use server";

import { createBusinessRecord } from "@/lib/businessRecords";
import { verifyCustomerPortalToken } from "@/lib/customerPortal";

export async function submitCustomerPortalRequest(token: string, formData: FormData) {
  const claims = await verifyCustomerPortalToken(token);
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  if (!subject || !message || subject.length > 160 || message.length > 4000) throw new Error("Enter a subject and message within the allowed length.");
  await createBusinessRecord(claims.partnerId, "customer-portal-request", { customer: claims.customer, subject, message, status: "Open", source: "customer-portal", createdAt: new Date().toISOString() });
}
