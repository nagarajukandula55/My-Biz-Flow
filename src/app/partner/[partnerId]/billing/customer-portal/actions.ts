"use server";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createCustomerPortalToken } from "@/lib/customerPortal";
import { redirect } from "next/navigation";
export async function createCustomerPortalLinkAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); const customer = String(formData.get("customer") ?? "").trim(); if (!customer) throw new Error("Customer is required."); const token = await createCustomerPortalToken({ partnerId, customer }); redirect(`/partner/${partnerId}/billing/customer-portal?link=${encodeURIComponent(`/customer-portal/${token}`)}`); }
