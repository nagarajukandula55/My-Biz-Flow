"use server";
import { redirect } from "next/navigation";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createBusinessRecord } from "@/lib/businessRecords";
import { patchBusinessRecordAction } from "@/lib/businessRecordActions";
import { getBusinessRecord } from "@/lib/businessRecords";
import { adjustExistingStockRecordQty } from "@/lib/inventoryStock";
import { findStockRecord } from "@/lib/inventoryRead";
import { withRecordLock } from "@/lib/withRecordLock";
import { assertModuleAccess, assertPartnerCanWrite } from "@/lib/tenant";

export async function createInteriorProjectAction(partnerId: string, formData: FormData) {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "interior-design");
  await assertPartnerCanWrite(partnerId);
  let boqLines: unknown[] = [];
  try { const parsed = JSON.parse(String(formData.get("boqLines") ?? "[]")); if (Array.isArray(parsed)) boqLines = parsed; } catch { throw new Error("BOQ lines must be valid structured data"); }
  if (!String(formData.get("projectName") ?? "").trim() || !String(formData.get("customer") ?? "").trim()) throw new Error("Project and customer are required.");
  if (!boqLines.length || boqLines.some((raw) => {
    if (!raw || typeof raw !== "object") return true;
    const line = raw as Record<string, unknown>;
    return !String(line.material ?? "").trim() || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 || !Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) < 0 || !Number.isFinite(Number(line.wastagePercent ?? 0)) || Number(line.wastagePercent ?? 0) < 0 || Number(line.wastagePercent ?? 0) > 100;
  })) throw new Error("BOQ lines require a material, positive quantity, valid price, and wastage between 0 and 100 percent.");
  const estimatedTotal = Math.round(boqLines.reduce((sum: number, raw: any) => sum + Number(raw.quantity) * (1 + Number(raw.wastagePercent ?? 0) / 100) * Number(raw.unitPrice), 0) * 100) / 100;
  const record = await createBusinessRecord(partnerId, "interior-design", {
    projectName: String(formData.get("projectName") ?? "").trim(), customer: String(formData.get("customer") ?? "").trim(), site: String(formData.get("site") ?? "").trim(), room: String(formData.get("room") ?? "").trim(), measurementNotes: String(formData.get("measurementNotes") ?? "").trim(), boqLines, status: "Draft", progressPercent: 0, estimatedTotal, billedTotal: 0, notes: String(formData.get("notes") ?? "").trim(),
  });
  redirect(`/partner/${partnerId}/interior-design/${record.id}`);
}

export async function setInteriorProjectStatus(partnerId: string, recordId: string, status: string) {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "interior-design");
  await assertPartnerCanWrite(partnerId);
  if (!["Submitted", "Approved", "In Progress"].includes(status)) throw new Error("Invalid project status");
  return withRecordLock("interior-project", `${partnerId}:${recordId}`, async () => {
  const current = await getBusinessRecord(partnerId, "interior-design", recordId);
  if (!current) throw new Error("Project not found");
  const allowed: Record<string, string> = { Draft: "Submitted", Submitted: "Approved", Approved: "In Progress" };
  if (allowed[String(current.status)] !== status) throw new Error("Project stage must advance in order.");
  const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
  await patchBusinessRecordAction(partnerId, "interior-design", recordId, { status, statusHistory: [...history, { status, at: new Date().toISOString() }] });
  });
}

export async function createInteriorProgressInvoice(partnerId: string, recordId: string, progressPercent: number) {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "interior-design");
  await assertModuleAccess(partnerId, "billing");
  await assertPartnerCanWrite(partnerId);
  if (!Number.isFinite(progressPercent) || progressPercent <= 0 || progressPercent > 100) throw new Error("Enter progress between 1 and 100 percent.");
  return withRecordLock("interior-project", `${partnerId}:${recordId}`, async () => {
  const project = await getBusinessRecord(partnerId, "interior-design", recordId);
  if (!project) throw new Error("Project not found");
  if (!["Approved", "In Progress", "Partially Billed"].includes(String(project.status))) throw new Error("Approve or start the project before billing");
  const last = Number(project.lastBilledPercent ?? 0);
  if (!Number.isFinite(last) || last < 0 || last >= progressPercent) throw new Error("Progress must exceed the last billed percentage.");
  const delta = progressPercent - last;
  const lines = (Array.isArray(project.boqLines) ? project.boqLines : []).map((l: any) => ({ description: String(l.material ?? "Material"), quantity: Number(l.quantity ?? 0) * delta / 100 * (1 + Number(l.wastagePercent ?? 0) / 100), unit: String(l.unit ?? "pcs"), unitPrice: Number(l.unitPrice ?? 0), taxRate: 18, measurement: l.measurement, wastagePercent: Number(l.wastagePercent ?? 0) }));
  if (!lines.length || lines.some((l: any) => !Number.isFinite(l.quantity) || l.quantity <= 0 || !Number.isFinite(l.unitPrice) || l.unitPrice < 0 || !Number.isFinite(l.wastagePercent) || l.wastagePercent < 0 || l.wastagePercent > 100)) throw new Error("The approved BOQ needs valid lines before billing.");
  const subtotal = Math.round(lines.reduce((s: number, l: any) => s + l.quantity * l.unitPrice, 0) * 100) / 100;
  const tax = Math.round(subtotal * 18) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const billedTotal = Math.round((Number(project.billedTotal ?? 0) + total) * 100) / 100;
  if (!Number.isFinite(billedTotal) || total <= 0) throw new Error("The BOQ has no billable value.");
  const invoice = await createBusinessRecord(partnerId, "billing", { customer: project.customer ?? "", issueDate: new Date().toISOString().slice(0, 10), items: lines, lineItemsSummary: lines.map((l: any) => l.description).join("; "), subtotal, taxAmount: tax, totalAmount: total, amountPaid: 0, amountDue: total, paymentStatus: "Draft", invoiceSource: "Interior Project", sourceInteriorProjectId: recordId, progressPercent, billedProgressDelta: delta });
  await patchBusinessRecordAction(partnerId, "interior-design", recordId, { status: progressPercent >= 100 ? "Completed" : "Partially Billed", billedTotal, lastInvoiceId: invoice.id, lastBilledPercent: progressPercent });
  });
}

export async function consumeApprovedInteriorBoq(partnerId: string, recordId: string, warehouseName = "Main Warehouse") {
  partnerId = await requireSessionPartnerId(partnerId);
  await assertModuleAccess(partnerId, "interior-design");
  await assertModuleAccess(partnerId, "inventory");
  await assertPartnerCanWrite(partnerId);
  return withRecordLock("inventory-partner", partnerId, async () => {
  const project = await getBusinessRecord(partnerId, "interior-design", recordId);
  if (!project || !["Approved", "In Progress", "Partially Billed"].includes(String(project.status))) throw new Error("Only an approved interior project can consume stock");
  if (project.stockConsumedAt) throw new Error("This BOQ has already consumed stock");
  const lines = Array.isArray(project.boqLines) ? project.boqLines as Array<any> : [];
  const normalized = lines.filter((l) => l.materialId).map((l) => ({ id: String(l.materialId), label: String(l.material ?? l.materialId), qty: Number(l.quantity ?? 0) * (1 + Number(l.wastagePercent ?? 0) / 100), wastagePercent: Number(l.wastagePercent ?? 0) }));
  if (!normalized.length || normalized.some((line) => !Number.isFinite(line.qty) || line.qty <= 0 || !Number.isFinite(line.wastagePercent) || line.wastagePercent < 0 || line.wastagePercent > 100)) throw new Error("The BOQ has no valid stock quantities.");
  const planned = new Map<string, { id: string; qty: number; label: string }>();
  for (const line of normalized) {
    const stock = await findStockRecord(partnerId, line.id, warehouseName, "Good");
    if (!stock) throw new Error(`Insufficient stock for ${line.label}`);
    const id = String(stock.id);
    const previous = planned.get(id);
    planned.set(id, { id, qty: (previous?.qty ?? 0) + line.qty, label: line.label });
  }
  for (const line of planned.values()) {
    const stock = await getBusinessRecord(partnerId, "inventory-stock", line.id);
    if (!stock || Number(stock.qtyOnHand ?? 0) - Number(stock.reservedQty ?? 0) < line.qty) throw new Error(`Insufficient available stock for ${line.label}`);
  }
  for (const line of planned.values()) await adjustExistingStockRecordQty(partnerId, line.id, -line.qty);
  await patchBusinessRecordAction(partnerId, "interior-design", recordId, { stockConsumedAt: new Date().toISOString(), stockConsumption: normalized, stockWarehouse: warehouseName });
  });
}
