"use server";
import { linkInvoiceJournal } from "@/lib/billingReconciliation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function linkInvoiceAction(partnerId: string, values: Record<string, unknown>) {
  const kind = String(values.documentKind ?? "billing");
  try { await linkInvoiceJournal(partnerId, String(values.invoiceNumber ?? "").trim(), String(values.journalNumber ?? "").trim(), kind); }
  catch (error) { return { error: error instanceof Error ? error.message : "Could not link journal." }; }
  revalidatePath(`/partner/${partnerId}/accounting/reconciliation`);
  redirect(`/partner/${partnerId}/accounting/reconciliation?kind=${encodeURIComponent(kind)}`);
}
