"use server";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { patchBusinessRecordAction } from "@/lib/businessRecordActions";
import { getBusinessRecord } from "@/lib/businessRecords";
import { adjustStockQty } from "@/lib/inventoryStock";
import { findStockRecord } from "@/lib/inventoryRead";

export async function createInteriorProjectAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionPartnerId(partnerId);
  let boqLines: unknown[] = [];
  try { const parsed = JSON.parse(String(formData.get("boqLines") ?? "[]")); if (Array.isArray(parsed)) boqLines = parsed; } catch { throw new Error("BOQ lines must be valid structured data"); }
  const estimatedTotal = boqLines.reduce((sum: number, raw: any) => sum + (Number(raw.quantity) || 0) * (1 + Math.max(0, Number(raw.wastagePercent) || 0) / 100) * (Number(raw.unitPrice) || 0), 0);
  const record = await createBusinessRecord(partnerId, "interior-design", {
    projectName: String(formData.get("projectName") ?? "").trim(), customer: String(formData.get("customer") ?? "").trim(), site: String(formData.get("site") ?? "").trim(), room: String(formData.get("room") ?? "").trim(), measurementNotes: String(formData.get("measurementNotes") ?? "").trim(), boqLines, status: "Draft", progressPercent: 0, estimatedTotal, billedTotal: 0, notes: String(formData.get("notes") ?? "").trim(),
  });
  redirect(`/partner/${partnerId}/interior-design/${record.id}`);
}

export async function setInteriorProjectStatus(partnerId: string, recordId: string, status: string) {
  if (!["Draft", "Submitted", "Approved", "In Progress", "Partially Billed", "Completed", "Cancelled"].includes(status)) throw new Error("Invalid project status");
  const current = await getBusinessRecord(partnerId, "interior-design", recordId);
  if (!current) throw new Error("Project not found");
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
  await patchBusinessRecordAction(partnerId, "interior-design", recordId, { status, statusHistory: [...history, { status, at: new Date().toISOString() }] });
}

export async function createInteriorProgressInvoice(partnerId: string, recordId: string, progressPercent: number) {
  partnerId = await requireSessionPartnerId(partnerId);
  const project = await getBusinessRecord(partnerId, "interior-design", recordId);
  if (!project) throw new Error("Project not found");
  if (!["Approved", "In Progress", "Partially Billed"].includes(String(project.status))) throw new Error("Approve or start the project before billing");
  const pct = Math.min(100, Math.max(1, Number(progressPercent) || 0));
  const lines = (Array.isArray(project.boqLines) ? project.boqLines : []).map((l: any) => ({ description: String(l.material ?? "Material"), quantity: Number(l.quantity ?? 0) * pct / 100 * (1 + Math.max(0, Number(l.wastagePercent ?? 0)) / 100), unit: String(l.unit ?? "pcs"), unitPrice: Number(l.unitPrice ?? 0), taxRate: 18, measurement: l.measurement }));
  const subtotal = lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0);
  const tax = subtotal * 0.18;
  const invoice = await createBusinessRecord(partnerId, "billing", { customer: project.customer ?? "", issueDate: new Date().toISOString().slice(0, 10), items: lines, lineItemsSummary: lines.map((l: any) => l.description).join("; "), subtotal, taxAmount: tax, totalAmount: subtotal + tax, amountPaid: 0, amountDue: subtotal + tax, paymentStatus: "Draft", invoiceSource: "Interior Project", sourceInteriorProjectId: recordId, progressPercent: pct });
  await patchBusinessRecordAction(partnerId, "interior-design", recordId, { status: pct >= 100 ? "Completed" : "Partially Billed", billedTotal: subtotal + tax, lastInvoiceId: invoice.id, lastBilledPercent: pct });
}

export async function consumeApprovedInteriorBoq(partnerId: string, recordId: string, warehouseName = "Main Warehouse") {
  partnerId = await requireSessionPartnerId(partnerId);
  const project = await getBusinessRecord(partnerId, "interior-design", recordId);
  if (!project || !["Approved", "In Progress", "Partially Billed"].includes(String(project.status))) throw new Error("Only an approved interior project can consume stock");
  if (project.stockConsumedAt) throw new Error("This BOQ has already consumed stock");
  const lines = Array.isArray(project.boqLines) ? project.boqLines as Array<any> : [];
  const normalized = lines.filter((l) => l.materialId).map((l) => ({ id: String(l.materialId), label: String(l.material ?? l.materialId), qty: Number(l.quantity ?? 0) * (1 + Math.max(0, Number(l.wastagePercent ?? 0)) / 100) }));
  for (const line of normalized) { const stock = await findStockRecord(partnerId, line.id, warehouseName, "Good"); if (!stock || Number(stock.qtyOnHand ?? 0) < line.qty) throw new Error(`Insufficient stock for ${line.label}`); }
  for (const line of normalized) await adjustStockQty(partnerId, line.id, line.label, warehouseName, -line.qty, "Good");
  await patchBusinessRecordAction(partnerId, "interior-design", recordId, { stockConsumedAt: new Date().toISOString(), stockConsumption: normalized, stockWarehouse: warehouseName });
}
