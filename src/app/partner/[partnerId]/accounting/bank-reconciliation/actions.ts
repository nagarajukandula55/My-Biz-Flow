"use server";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { importAndMatchBankCsv } from "@/lib/bankReconciliation";
import { revalidatePath } from "next/cache";
export async function importBankCsvAction(partnerId: string, formData: FormData) { await requireSessionPartnerId(partnerId); await importAndMatchBankCsv(partnerId, String(formData.get("csv") ?? "")); revalidatePath(`/partner/${partnerId}/accounting/bank-reconciliation`); }
