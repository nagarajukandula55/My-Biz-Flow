"use server";
import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { postInvoiceJournal } from "@/lib/billingReconciliation";
export async function postInvoiceJournalAction(partnerId: string, invoiceId: string, formData: FormData) { partnerId = await requireSessionPartnerId(partnerId); const result = await postInvoiceJournal(partnerId, invoiceId, { receivableAccountId: String(formData.get("receivableAccountId") ?? ""), revenueAccountId: String(formData.get("revenueAccountId") ?? ""), taxAccountId: String(formData.get("taxAccountId") ?? "") || undefined, entryNumber: String(formData.get("entryNumber") ?? "") }); if (result.error) throw new Error(result.error); revalidatePath(`/partner/${partnerId}/accounting/invoice-reconciliation`); }
