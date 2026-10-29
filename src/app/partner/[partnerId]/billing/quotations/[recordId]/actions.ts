"use server";

import { getBusinessRecord } from "@/lib/businessRecords";
import { createBusinessRecord } from "@/lib/businessRecords";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { redirect } from "next/navigation";
import { runWorkflowAutomations } from "@/lib/workflowAutomation";

export async function convertQuotationToInvoice(partnerId: string, quotationId: string) {
  partnerId = await requireSessionPartnerId(partnerId);
  const quotation = await getBusinessRecord(partnerId, "billing-quotations", quotationId);
  if (!quotation) throw new Error("Quotation not found");
  const items = Array.isArray(quotation.items) ? quotation.items : [];
  const invoice = await createBusinessRecord(partnerId, "billing", {
    customer: quotation.contact ?? "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    items,
    lineItemsSummary: quotation.lineItemsSummary ?? "",
    subtotal: Number(quotation.subtotal ?? 0),
    taxAmount: Number(quotation.taxAmount ?? 0),
    totalAmount: Number(quotation.totalAmount ?? 0),
    discountAmount: 0,
    roundOff: 0,
    amountPaid: 0,
    amountDue: Number(quotation.totalAmount ?? 0),
    paymentStatus: "Draft",
    invoiceSource: "Quotation",
    sourceQuotationId: quotationId,
    notes: quotation.notes ?? "",
  });
  await runWorkflowAutomations(partnerId, { trigger: "quotation.approved", moduleSlug: "billing", recordId: quotationId, record: { ...quotation, convertedInvoiceId: invoice.id } });
  redirect(`/partner/${partnerId}/billing/${invoice.id}`);
}
