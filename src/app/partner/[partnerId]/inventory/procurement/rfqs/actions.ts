"use server";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createRfq, recordRfqQuote } from "@/lib/procurementData";
import { revalidatePath } from "next/cache";
export async function createRfqAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); await createRfq(partnerId, { materialLabel: String(formData.get("materialLabel") ?? ""), quantity: Number(formData.get("quantity") ?? 0), dueDate: String(formData.get("dueDate") ?? ""), supplierIds: String(formData.get("supplierIds") ?? "").split(",").map(v => v.trim()).filter(Boolean) }); revalidatePath(`/partner/${partnerId}/inventory/procurement/rfqs`); }
export async function recordRfqQuoteAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); await recordRfqQuote(partnerId, String(formData.get("rfqId") ?? ""), { supplierId: String(formData.get("supplierId") ?? ""), supplierName: String(formData.get("supplierName") ?? ""), unitPrice: Number(formData.get("unitPrice") ?? 0), deliveryDays: Number(formData.get("deliveryDays") ?? 0) }); revalidatePath(`/partner/${partnerId}/inventory/procurement/rfqs`); }
