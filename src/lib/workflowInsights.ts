import { listBusinessRecords } from "@/lib/businessRecords";
export type WorkflowInsight = { key: string; severity: "info" | "warning" | "urgent"; title: string; reason: string; href?: string };
export async function getWorkflowInsights(partnerId: string): Promise<WorkflowInsight[]> {
  const [billing, stock, rfqs, changes] = await Promise.all([listBusinessRecords(partnerId, "billing"), listBusinessRecords(partnerId, "inventory-stock"), listBusinessRecords(partnerId, "inventory-rfq"), listBusinessRecords(partnerId, "interior-change-order")]);
  const insights: WorkflowInsight[] = [];
  const overdue = billing.filter(row => String(row.paymentStatus) === "Overdue" || (Number(row.amountDue ?? 0) > 0 && String(row.dueDate ?? "") < new Date().toISOString().slice(0, 10)));
  if (overdue.length) insights.push({ key: "overdue-invoices", severity: "urgent", title: `${overdue.length} invoice${overdue.length === 1 ? " is" : "s are"} overdue`, reason: "Outstanding billing requires collection follow-up.", href: "billing" });
  const lowStock = stock.filter(row => Number(row.qtyOnHand ?? 0) <= Number(row.reorderLevel ?? 0) && Number(row.reorderLevel ?? 0) > 0 && String(row.condition ?? "Good") === "Good");
  if (lowStock.length) insights.push({ key: "low-stock", severity: "warning", title: `${lowStock.length} material${lowStock.length === 1 ? " is" : "s are"} at reorder level`, reason: "Review Part Planning or raise procurement before stock-outs.", href: "inventory/part-planning" });
  const openRfqs = rfqs.filter(row => String(row.status) === "Open" && (!Array.isArray(row.quotes) || row.quotes.length === 0));
  if (openRfqs.length) insights.push({ key: "rfq-no-quotes", severity: "info", title: `${openRfqs.length} RFQ${openRfqs.length === 1 ? " has" : "s have"} no supplier quote`, reason: "Follow up with suppliers or add a comparison quote.", href: "inventory/procurement/rfqs" });
  const pendingChanges = changes.filter(row => String(row.status) === "Pending Approval");
  if (pendingChanges.length) insights.push({ key: "change-orders", severity: "warning", title: `${pendingChanges.length} Interior change order${pendingChanges.length === 1 ? " needs" : "s need"} approval`, reason: "Approve or reject before project billing is updated.", href: "interior-design/controls" });
  return insights;
}
