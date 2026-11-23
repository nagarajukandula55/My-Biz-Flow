"use server";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createPurchaseOrder, receivePurchaseOrder } from "@/lib/procurementData";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listBusinessRecords } from "@/lib/businessRecords";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { getWarehouseOptionsForPartner } from "@/lib/sample-data/warehouse";

export async function createPurchaseOrderAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
  const supplierId = String(formData.get("supplierId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const [suppliers, materials, warehouses] = await Promise.all([listBusinessRecords(partnerId, "inventory-supplier"), getBomOptionsForPartner(partnerId), getWarehouseOptionsForPartner(partnerId)]);
  const supplier = suppliers.find((item) => String(item.id) === supplierId);
  const material = materials.find((item) => item.value === materialId);
  const warehouse = warehouses.find((item) => item.value === warehouseId);
  if (!supplier || !material || !warehouse) throw new Error("Choose a valid supplier, inventory material and warehouse.");
  await createPurchaseOrder(partnerId, { supplierId, supplierName: String(supplier.name ?? supplier.id), expectedDate: String(formData.get("expectedDate") ?? ""), lines: [{ materialId, materialLabel: material.label, quantity: Number(formData.get("quantity") ?? 0), unitPrice: Number(formData.get("unitPrice") ?? 0), warehouseId, warehouseName: warehouse.label, serialized: material.serialized }] });
  revalidatePath(`/partner/${partnerId}/inventory/procurement`);
  redirect(`/partner/${partnerId}/inventory/procurement?saved=1`);
}

export async function receivePurchaseOrderAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
  await receivePurchaseOrder(partnerId, String(formData.get("purchaseOrderId") ?? ""), {
    supplierInvoice: String(formData.get("supplierInvoice") ?? ""),
    quantities: formData.getAll("receivedQuantity").map(Number),
    serialNumbersRaw: formData.getAll("serialNumbers").map(String),
  });
  revalidatePath(`/partner/${partnerId}/inventory/procurement`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  redirect(`/partner/${partnerId}/inventory/procurement?saved=1`);
}
