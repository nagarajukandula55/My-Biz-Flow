import { listBusinessRecords } from "@/lib/businessRecords";
import { runWorkflowAutomations } from "@/lib/workflowAutomation";

export async function runOverdueInvoiceAutomations(partnerId: string, today = new Date()): Promise<number> {
  const invoices = await listBusinessRecords(partnerId, "billing");
  const cutoff = today.toISOString().slice(0, 10);
  let triggered = 0;
  for (const invoice of invoices) {
    const dueDate = String(invoice.dueDate ?? "").slice(0, 10);
    const paymentStatus = String(invoice.paymentStatus ?? "").toLowerCase();
    if (!dueDate || dueDate >= cutoff || ["paid", "cancelled", "draft"].includes(paymentStatus)) continue;
    await runWorkflowAutomations(partnerId, { trigger: "invoice.overdue", moduleSlug: "billing", recordId: String(invoice.id), record: invoice });
    triggered++;
  }
  return triggered;
}
