"use server";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { createPurchaseOrder, receivePurchaseOrder } from "@/lib/procurementData";
import { revalidatePath } from "next/cache";

export async function createPurchaseOrderAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
  await createPurchaseOrder(partnerId, {
    supplierId: String(formData.get("supplierId") ?? ""), supplierName: String(formData.get("supplierName") ?? ""), expectedDate: String(formData.get("expectedDate") ?? ""),
    lines: [{ materialId: String(formData.get("materialId") ?? ""), materialLabel: String(formData.get("materialLabel") ?? ""), quantity: Number(formData.get("quantity") ?? 0), unitPrice: Number(formData.get("unitPrice") ?? 0), warehouseName: String(formData.get("warehouseName") ?? "Main Warehouse") }],
  });
  revalidatePath(`/partner/${partnerId}/inventory/procurement`);
}

export async function receivePurchaseOrderAction(partnerId: string, formData: FormData) {
  await requireSessionPartnerId(partnerId);
  await receivePurchaseOrder(partnerId, String(formData.get("purchaseOrderId") ?? ""));
  revalidatePath(`/partner/${partnerId}/inventory/procurement`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
}
