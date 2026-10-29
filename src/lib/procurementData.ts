import type { Row } from "@/components/DataTable";
import { createBusinessRecord, listBusinessRecords, updateBusinessRecord } from "@/lib/businessRecords";
import { adjustStockQty } from "@/lib/inventoryStock";

export type PurchaseLine = { materialId: string; materialLabel: string; quantity: number; unitPrice: number; warehouseName: string };

export async function listSuppliers(partnerId: string) { return listBusinessRecords(partnerId, "inventory-supplier"); }
export async function listPurchaseOrders(partnerId: string) { return listBusinessRecords(partnerId, "inventory-purchase-order"); }

export async function createPurchaseOrder(partnerId: string, input: { supplierId: string; supplierName: string; expectedDate?: string; lines: PurchaseLine[] }): Promise<Row> {
  if (!input.supplierId || !input.supplierName) throw new Error("Supplier is required.");
  if (!input.lines.length || input.lines.some(line => !line.materialId || !line.warehouseName || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) throw new Error("Add valid purchase lines.");
  const total = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return createBusinessRecord(partnerId, "inventory-purchase-order", {
    supplierId: input.supplierId, supplierName: input.supplierName, expectedDate: input.expectedDate ?? "", lines: input.lines,
    totalAmount: Number(total.toFixed(2)), status: "Open", receivedAt: "", createdAt: new Date().toISOString(),
  });
}

export async function receivePurchaseOrder(partnerId: string, purchaseOrderId: string): Promise<void> {
  const orders = await listPurchaseOrders(partnerId);
  const order = orders.find(row => String(row.id) === purchaseOrderId);
  if (!order) throw new Error("Purchase order not found.");
  if (String(order.status) === "Received") throw new Error("Purchase order has already been received.");
  const lines = Array.isArray(order.lines) ? order.lines as PurchaseLine[] : [];
  for (const line of lines) await adjustStockQty(partnerId, line.materialId, line.materialLabel, line.warehouseName, line.quantity, "Good");
  const receivedAt = new Date().toISOString();
  await updateBusinessRecord(partnerId, "inventory-purchase-order", purchaseOrderId, { ...order, status: "Received", receivedAt });
  await createBusinessRecord(partnerId, "inventory-receipt", { purchaseOrderId, supplierId: order.supplierId, supplierName: order.supplierName, lines, receivedAt, status: "Posted" });
}
