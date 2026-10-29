import { listBusinessRecords } from "@/lib/businessRecords";
export type WorkflowInsight = { key: string; severity: "info" | "warning" | "urgent"; title: string; reason: string; href?: string };
export async function getWorkflowInsights(partnerId: string): Promise<WorkflowInsight[]> {
  const [billing, stock, rfqs, changes, workorders, wholesaleOrders, projects] = await Promise.all([
    listBusinessRecords(partnerId, "billing"),
    listBusinessRecords(partnerId, "inventory-stock"),
    listBusinessRecords(partnerId, "inventory-rfq"),
    listBusinessRecords(partnerId, "interior-change-order"),
    listBusinessRecords(partnerId, "service-centre"),
    listBusinessRecords(partnerId, "wholesale-b2b"),
    listBusinessRecords(partnerId, "interior-design"),
  ]);
  const insights: WorkflowInsight[] = [];
  const overdue = billing.filter(row => String(row.paymentStatus) === "Overdue" || (Number(row.amountDue ?? 0) > 0 && String(row.dueDate ?? "") < new Date().toISOString().slice(0, 10)));
  if (overdue.length) insights.push({ key: "overdue-invoices", severity: "urgent", title: `${overdue.length} invoice${overdue.length === 1 ? " is" : "s are"} overdue`, reason: "Outstanding billing requires collection follow-up.", href: "billing" });
  const lowStock = stock.filter(row => Number(row.qtyOnHand ?? 0) <= Number(row.reorderLevel ?? 0) && Number(row.reorderLevel ?? 0) > 0 && String(row.condition ?? "Good") === "Good");
  if (lowStock.length) insights.push({ key: "low-stock", severity: "warning", title: `${lowStock.length} material${lowStock.length === 1 ? " is" : "s are"} at reorder level`, reason: "Review Part Planning or raise procurement before stock-outs.", href: "inventory/part-planning" });
  const openRfqs = rfqs.filter(row => String(row.status) === "Open" && (!Array.isArray(row.quotes) || row.quotes.length === 0));
  if (openRfqs.length) insights.push({ key: "rfq-no-quotes", severity: "info", title: `${openRfqs.length} RFQ${openRfqs.length === 1 ? " has" : "s have"} no supplier quote`, reason: "Follow up with suppliers or add a comparison quote.", href: "inventory/procurement/rfqs" });
  const pendingChanges = changes.filter(row => String(row.status) === "Pending Approval");
  if (pendingChanges.length) insights.push({ key: "change-orders", severity: "warning", title: `${pendingChanges.length} Interior change order${pendingChanges.length === 1 ? " needs" : "s need"} approval`, reason: "Approve or reject before project billing is updated.", href: "interior-design/controls" });
  const now = Date.now();
  const overdueWorkorders = workorders.filter(row => {
    const stage = String(row.stage ?? "Created");
    const due = new Date(String(row.slaDate ?? "")).getTime();
    return stage !== "Closed" && !row.cancelledAt && Number.isFinite(due) && due < now;
  });
  if (overdueWorkorders.length) insights.push({ key: "service-centre-sla", severity: "urgent", title: `${overdueWorkorders.length} service job${overdueWorkorders.length === 1 ? " is" : "s are"} past promised date`, reason: "Review the workorder, update the customer and record the next action.", href: "service-centre" });
  const awaitingDealerAction = wholesaleOrders.filter(row => ["Pending", "Submitted", "Requested"].includes(String(row.status ?? row.orderStatus)));
  if (awaitingDealerAction.length) insights.push({ key: "dealer-orders", severity: "info", title: `${awaitingDealerAction.length} distributor order${awaitingDealerAction.length === 1 ? " is" : "s are"} awaiting action`, reason: "Accept, reject or move dealer orders into fulfilment so portal requests do not stall.", href: "wholesale-b2b" });
  const projectsMissingMeasurement = projects.filter(row => {
    const measurements = row.measurements;
    return String(row.status ?? "").toLowerCase() !== "completed" && (!Array.isArray(measurements) || measurements.length === 0);
  });
  if (projectsMissingMeasurement.length) insights.push({ key: "interior-measurements", severity: "info", title: `${projectsMissingMeasurement.length} interior project${projectsMissingMeasurement.length === 1 ? " is" : "s are"} missing measurements`, reason: "Capture room measurements before preparing the BOQ so quantity and material pricing stay auditable.", href: "interior-design" });
  return insights;
}
