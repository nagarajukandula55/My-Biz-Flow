import type { Row } from "@/components/DataTable";
import { createBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { adjustStockQty } from "@/lib/inventoryStock";
import { parseSerialNumbers, validateSerialNumbers } from "@/lib/inventoryRead";
import { createStockLots } from "@/lib/stockLots";
import { recordInventoryTransaction } from "@/lib/inventoryLedger";
import { withRecordLock } from "@/lib/withRecordLock";
import { runWorkflowAutomations } from "@/lib/workflowAutomation";

export type PurchaseLine = { materialId: string; materialLabel: string; quantity: number; receivedQuantity?: number; unitPrice: number; warehouseId: string; warehouseName: string; serialized: boolean };

export async function listSuppliers(partnerId: string) { return listBusinessRecords(partnerId, "inventory-supplier"); }
export async function listPurchaseOrders(partnerId: string) { return listBusinessRecords(partnerId, "inventory-purchase-order"); }
export async function listRfqs(partnerId: string) { return listBusinessRecords(partnerId, "inventory-rfq"); }

export async function createRfq(partnerId: string, input: { materialLabel: string; quantity: number; dueDate?: string; supplierIds: string[] }) {
  if (!input.materialLabel.trim() || !Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error("Material and quantity are required.");
  const supplierIds = input.supplierIds.map(id => id.trim()).filter(Boolean);
  if (supplierIds.length) {
    const suppliers = await listSuppliers(partnerId);
    const validIds = new Set(suppliers.map(supplier => String(supplier.id)));
    if (supplierIds.some(id => !validIds.has(id))) throw new Error("RFQ contains an unknown supplier.");
  }
  const rfq = await createBusinessRecord(partnerId, "inventory-rfq", { ...input, supplierIds, status: "Open", quotes: [], createdAt: new Date().toISOString() });
  await runWorkflowAutomations(partnerId, { trigger: "procurement.rfq-created", moduleSlug: "inventory", recordId: String(rfq.id), record: rfq });
  return rfq;
}

export async function recordRfqQuote(partnerId: string, rfqId: string, quote: { supplierId: string; supplierName: string; unitPrice: number; deliveryDays: number }) {
  if (!quote.supplierId.trim() || !quote.supplierName.trim() || !Number.isFinite(quote.unitPrice) || quote.unitPrice < 0 || !Number.isFinite(quote.deliveryDays) || quote.deliveryDays < 0) throw new Error("Supplier, price and delivery days are required.");
  const rfq = (await listRfqs(partnerId)).find(row => String(row.id) === rfqId);
  if (!rfq) throw new Error("RFQ not found.");
  const quotes = Array.isArray(rfq.quotes) ? rfq.quotes as Array<{ supplierId?: string }> : [];
  const nextQuote = { ...quote, quotedAt: new Date().toISOString() };
  const existingIndex = quotes.findIndex(item => String(item.supplierId ?? "") === quote.supplierId);
  const nextQuotes = existingIndex >= 0 ? quotes.map((item, index) => index === existingIndex ? nextQuote : item) : [...quotes, nextQuote];
  await updateBusinessRecord(partnerId, "inventory-rfq", rfqId, { ...rfq, quotes: nextQuotes });
}

export async function createPurchaseOrder(partnerId: string, input: { supplierId: string; supplierName: string; expectedDate?: string; lines: PurchaseLine[] }): Promise<Row> {
  if (!input.supplierId || !input.supplierName) throw new Error("Supplier is required.");
  if (!input.lines.length || input.lines.some(line => !line.materialId || !line.warehouseName || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) throw new Error("Add valid purchase lines.");
  const total = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return createBusinessRecord(partnerId, "inventory-purchase-order", {
    supplierId: input.supplierId, supplierName: input.supplierName, expectedDate: input.expectedDate ?? "",
    totalAmount: Number(total.toFixed(2)), status: "Open", receivedAt: "", createdAt: new Date().toISOString(),
    lines: input.lines.map((line) => ({ ...line, receivedQuantity: 0 })),
  });
}

export async function receivePurchaseOrder(partnerId: string, purchaseOrderId: string, input: { supplierInvoice?: string; quantities: number[]; serialNumbersRaw: string[] }): Promise<void> {
  return withRecordLock("inventory-partner", partnerId, async () => {
    const order = (await listPurchaseOrders(partnerId)).find(row => String(row.id) === purchaseOrderId);
    if (!order) throw new Error("Purchase order not found.");
    if (String(order.status) === "Received") throw new Error("Purchase order has already been fully received.");
    const lines = Array.isArray(order.lines) ? order.lines as PurchaseLine[] : [];
    const nextLines: PurchaseLine[] = [];
    const receiptLines: Array<Record<string, unknown>> = [];
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const alreadyReceived = Number(line.receivedQuantity ?? 0);
      const remaining = Math.max(0, line.quantity - alreadyReceived);
      const quantity = Number(input.quantities[index] ?? 0);
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > remaining) throw new Error(`${line.materialLabel}: receipt quantity must be between 0 and ${remaining}.`);
      if (line.serialized && !Number.isInteger(quantity)) throw new Error(`${line.materialLabel} is serialized and must be received in whole units.`);
      const serials = parseSerialNumbers(input.serialNumbersRaw[index]);
      if (line.serialized) {
        const error = validateSerialNumbers(serials, quantity, line.materialLabel);
        if (error) throw new Error(error);
      } else if (serials.length) throw new Error(`${line.materialLabel} is non-serialized; leave serial/barcode numbers blank.`);
      if (quantity > 0) {
        await createStockLots({ partnerId, warehouseId: line.warehouseId, warehouseName: line.warehouseName, materialId: line.materialId, materialLabel: line.materialLabel, condition: "Good", serialized: line.serialized, serialNumbers: line.serialized ? serials : undefined, quantity: line.serialized ? undefined : quantity, unitCost: Math.round(line.unitPrice * 100), sourceType: "purchase-receipt", sourceRecordId: purchaseOrderId });
        await adjustStockQty(partnerId, line.materialId, line.materialLabel, line.warehouseName, quantity, "Good");
        receiptLines.push({ materialId: line.materialId, materialLabel: line.materialLabel, quantity, serialNumbers: serials, warehouseId: line.warehouseId, warehouseName: line.warehouseName, unitPrice: line.unitPrice });
      }
      nextLines.push({ ...line, receivedQuantity: alreadyReceived + quantity });
    }
    if (!receiptLines.length) throw new Error("Enter at least one received quantity.");
    const fullyReceived = nextLines.every((line) => Number(line.receivedQuantity ?? 0) >= line.quantity);
    const receivedAt = new Date().toISOString();
    await updateBusinessRecord(partnerId, "inventory-purchase-order", purchaseOrderId, { ...order, lines: nextLines, status: fullyReceived ? "Received" : "Partially Received", receivedAt: fullyReceived ? receivedAt : order.receivedAt ?? "" });
    const receipt = await createBusinessRecord(partnerId, "inventory-receipt", { purchaseOrderId, supplierId: order.supplierId, supplierName: order.supplierName, supplierInvoice: input.supplierInvoice?.trim() ?? "", lines: receiptLines, receivedAt, status: "Posted" });
    await recordInventoryTransaction({ partnerId, sourceType: "purchase-receipt", sourceRecordId: String(receipt.id), direction: "debit", amount: Math.round(receiptLines.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0) * 100), description: `Supplier stock receipt for PO ${purchaseOrderId}` });
  });
}
