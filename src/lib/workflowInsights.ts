import { listBusinessRecords } from "@/lib/businessRecords";
import { findOpenVisit, listAmcContractsWithVisits, computeSlaBreach } from "@/lib/amcContractsData";
import { listWholesaleOrders } from "@/lib/wholesaleData";
export type WorkflowInsight = { key: string; severity: "info" | "warning" | "urgent"; title: string; reason: string; href?: string };
export async function getWorkflowInsights(partnerId: string): Promise<WorkflowInsight[]> {
  const [billing, stock, rfqs, changes, workorders, wholesaleOrders, projects, selections, selectionResponses, amcContracts, wholesaleRecords, wholesaleDispatches, wholesaleFulfillment] = await Promise.all([
    listBusinessRecords(partnerId, "billing"),
    listBusinessRecords(partnerId, "inventory-stock"),
    listBusinessRecords(partnerId, "inventory-rfq"),
    listBusinessRecords(partnerId, "interior-change-order"),
    listBusinessRecords(partnerId, "service-centre"),
    listBusinessRecords(partnerId, "wholesale-b2b"),
    listBusinessRecords(partnerId, "interior-design"),
    listBusinessRecords(partnerId, "interior-selection"),
    listBusinessRecords(partnerId, "interior-selection-response"),
    listAmcContractsWithVisits(partnerId),
    listWholesaleOrders(partnerId),
    listBusinessRecords(partnerId, "wholesale-dispatch"),
    listBusinessRecords(partnerId, "wholesale-fulfillment"),
  ]);
  const insights: WorkflowInsight[] = [];
  const overdue = billing.filter(row => String(row.paymentStatus) === "Overdue" || (Number(row.amountDue ?? 0) > 0 && String(row.dueDate ?? "") < new Date().toISOString().slice(0, 10)));
  if (overdue.length) insights.push({ key: "overdue-invoices", severity: "urgent", title: `${overdue.length} invoice${overdue.length === 1 ? " is" : "s are"} overdue`, reason: "Outstanding billing requires collection follow-up.", href: "billing" });
  const lowStock = stock.filter(row => Number(row.qtyOnHand ?? 0) <= Number(row.reorderLevel ?? 0) && Number(row.reorderLevel ?? 0) > 0 && String(row.condition ?? "Good") === "Good");
  if (lowStock.length) insights.push({ key: "low-stock", severity: "warning", title: `${lowStock.length} material${lowStock.length === 1 ? " is" : "s are"} at reorder level`, reason: "Review Part Planning or raise procurement before stock-outs.", href: "inventory/part-planning" });
  const openRfqs = rfqs.filter(row => String(row.status) === "Open" && (!Array.isArray(row.quotes) || row.quotes.length === 0));
  if (openRfqs.length) insights.push({ key: "rfq-no-quotes", severity: "info", title: `${openRfqs.length} RFQ${openRfqs.length === 1 ? " has" : "s have"} no supplier quote`, reason: "Follow up with suppliers or add a comparison quote.", href: "inventory/procurement/rfqs" });
  const quotedRfqs = rfqs.filter(row => String(row.status) === "Open" && Array.isArray(row.quotes) && row.quotes.length > 1);
  const highVarianceRfqs = quotedRfqs.filter(row => {
    const amounts = (row.quotes as unknown[]).map(quote => Number((quote as Record<string, unknown>).totalAmount ?? (quote as Record<string, unknown>).amount ?? NaN)).filter(Number.isFinite);
    if (amounts.length < 2) return false;
    const lowest = Math.min(...amounts);
    const highest = Math.max(...amounts);
    return lowest > 0 && ((highest - lowest) / lowest) >= 0.2;
  });
  if (highVarianceRfqs.length) insights.push({ key: "rfq-price-variance", severity: "warning", title: `${highVarianceRfqs.length} RFQ${highVarianceRfqs.length === 1 ? " has" : "s have"} wide quote variance`, reason: "Compare supplier terms, tax, delivery and warranty before accepting the lowest amount; the price difference may reflect scope.", href: "inventory/procurement/rfqs" });
  const collectionRisk = billing.filter(row => {
    const due = Number(row.amountDue ?? 0);
    const total = Number(row.totalAmount ?? 0);
    return due > 0 && total > 0 && due / total >= 0.5 && (String(row.paymentStatus) === "Pending" || String(row.paymentStatus) === "Partial");
  });
  if (collectionRisk.length) insights.push({ key: "collection-risk", severity: "warning", title: `${collectionRisk.length} invoice${collectionRisk.length === 1 ? " has" : "s have"} a significant balance`, reason: "Prioritise collection follow-up for invoices with at least half of the value still outstanding.", href: "billing" });
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
  const fulfillmentByOrder = new Map(wholesaleFulfillment.map(row => [String(row.orderId ?? ""), String(row.stage ?? "")]));
  const confirmedWholesale = wholesaleRecords.filter(order => order.status === "Confirmed" && !["Picked", "Packed"].includes(fulfillmentByOrder.get(String(order.id)) ?? ""));
  if (confirmedWholesale.length) insights.push({ key: "wholesale-pick-backlog", severity: "warning", title: `${confirmedWholesale.length} confirmed distributor order${confirmedWholesale.length === 1 ? " is" : "s are"} waiting to be picked`, reason: "Prepare the warehouse pick list before dispatching these confirmed orders.", href: "wholesale-b2b/pick-list" });
  const dispatchIds = new Set(wholesaleDispatches.map(row => String(row.orderId ?? "")));
  const dispatchedWithoutHandoff = wholesaleRecords.filter(order => order.status === "Dispatched" && !dispatchIds.has(order.id));
  if (dispatchedWithoutHandoff.length) insights.push({ key: "wholesale-dispatch-metadata", severity: "urgent", title: `${dispatchedWithoutHandoff.length} dispatched order${dispatchedWithoutHandoff.length === 1 ? " is" : "s are"} missing tracking details`, reason: "Record the carrier and tracking/LR number before the logistics handoff is considered complete.", href: "wholesale-b2b" });
  const projectsMissingMeasurement = projects.filter(row => {
    const measurements = row.measurements;
    return String(row.status ?? "").toLowerCase() !== "completed" && (!Array.isArray(measurements) || measurements.length === 0);
  });
  if (projectsMissingMeasurement.length) insights.push({ key: "interior-measurements", severity: "info", title: `${projectsMissingMeasurement.length} interior project${projectsMissingMeasurement.length === 1 ? " is" : "s are"} missing measurements`, reason: "Capture room measurements before preparing the BOQ so quantity and material pricing stay auditable.", href: "interior-design" });
  const projectById = new Map(projects.map(project => [String(project.id), project]));
  const selectionsAwaitingBoq = selections.filter(selection => {
    if (!["Client Approved", "Procurement Ready"].includes(String(selection.status))) return false;
    const project = projectById.get(String(selection.projectId));
    const lines = project?.boqLines;
    return !Array.isArray(lines) || !lines.some(line => Boolean(line) && typeof line === "object" && String((line as Record<string, unknown>).selectionId ?? "") === String(selection.id));
  });
  if (selectionsAwaitingBoq.length) insights.push({ key: "interior-selections-awaiting-boq", severity: "warning", title: `${selectionsAwaitingBoq.length} approved material selection${selectionsAwaitingBoq.length === 1 ? " is" : "s are"} not in the BOQ`, reason: "Enter quantity and pricing, then convert the approved selection into its project BOQ before procurement or billing.", href: "interior-design/selections" });
  const selectionChangesRequested = selectionResponses.filter(response => String(response.response ?? "") === "Change requested");
  if (selectionChangesRequested.length) insights.push({ key: "interior-selection-changes", severity: "warning", title: `${selectionChangesRequested.length} client material selection${selectionChangesRequested.length === 1 ? " needs" : "s need"} review`, reason: "A customer requested a change to an interior material selection; review the note before procurement or billing.", href: "interior-design/selections" });
  const openAmc = amcContracts.map(contract => ({ contract, visit: findOpenVisit(contract) })).filter(row => row.visit);
  const unassignedAmc = openAmc.filter(row => !row.visit!.technicianId);
  const slaRiskAmc = openAmc.filter(row => computeSlaBreach({ contractStatus: row.contract.contractStatus, serviceStatus: row.visit!.status, slaHours: row.contract.slaHours, renewalTermMonths: row.contract.renewalTermMonths, serviceRequestRaisedAt: row.visit!.serviceRequestRaisedAt?.toISOString(), technicianId: row.visit!.technicianId ?? undefined }));
  if (unassignedAmc.length) insights.push({ key: "amc-unassigned", severity: slaRiskAmc.length ? "urgent" : "warning", title: `${unassignedAmc.length} AMC service request${unassignedAmc.length === 1 ? " is" : "s are"} unassigned`, reason: slaRiskAmc.length ? `${slaRiskAmc.length} request${slaRiskAmc.length === 1 ? " has" : "s have"} exceeded the response SLA; assign a technician now.` : "Assign a technician before the response SLA is missed.", href: "amc-field-service/dispatch-board" });
  return insights;
}
