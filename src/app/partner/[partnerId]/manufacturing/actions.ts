"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { findStockRecord, adjustStockQty } from "@/lib/inventoryStock";
import { createBusinessRecord } from "@/lib/businessRecords";
import { sendPartnerTelegramAlert } from "@/lib/telegram";
import { getPartner } from "@/lib/partnerData";
import {
  productionDelayedMessage,
  productionStockShortfallMessage,
  productionCompletedMessage,
} from "@/lib/telegramTemplates";
import {
  createBom,
  updateBom,
  createWorkCenter,
  updateWorkCenter,
  createProductionOrder,
  updateProductionOrder,
  setProductionOrderStatus,
  getProductionOrder,
  type BomLineInput,
  type ProductionOrderStatus,
} from "@/lib/manufacturing";

function parseDate(value: unknown): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------
// Bill of Materials
// ---------------------------------------------------------------------

export async function createBomAction(
  partnerId: string,
  values: Record<string, unknown>,
  lines: BomLineInput[]
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const productName = String(values["productName"] ?? "").trim();
  if (!productName) return { error: "Product Name is required." };
  if (lines.length === 0) return { error: "Add at least one BOM line before saving." };

  const bom = await createBom(partnerId, {
    productName,
    productCode: values["productCode"] ? String(values["productCode"]) : undefined,
    isActive: values["isActive"] !== false,
    lines,
  });

  revalidatePath(`/partner/${partnerId}/manufacturing/bom`);
  redirect(`/partner/${partnerId}/manufacturing/bom/${bom.id}`);
}

export async function updateBomAction(
  partnerId: string,
  bomId: string,
  values: Record<string, unknown>,
  lines: BomLineInput[]
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const productName = String(values["productName"] ?? "").trim();
  if (!productName) return { error: "Product Name is required." };
  if (lines.length === 0) return { error: "Add at least one BOM line before saving." };

  const bom = await updateBom(partnerId, bomId, {
    productName,
    productCode: values["productCode"] ? String(values["productCode"]) : undefined,
    isActive: values["isActive"] !== false,
    lines,
  });
  if (!bom) return { error: "Bill of Material not found." };

  revalidatePath(`/partner/${partnerId}/manufacturing/bom`);
  revalidatePath(`/partner/${partnerId}/manufacturing/bom/${bomId}`);
  redirect(`/partner/${partnerId}/manufacturing/bom/${bomId}`);
}

// ---------------------------------------------------------------------
// Work Centers
// ---------------------------------------------------------------------

export async function createWorkCenterAction(partnerId: string, values: Record<string, unknown>): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };

  await createWorkCenter(partnerId, {
    name,
    capacityPerDay: values["capacityPerDay"] === "" || values["capacityPerDay"] == null ? null : Number(values["capacityPerDay"]),
    isActive: values["isActive"] !== false,
  });

  revalidatePath(`/partner/${partnerId}/manufacturing/work-centers`);
  redirect(`/partner/${partnerId}/manufacturing/work-centers`);
}

export async function updateWorkCenterAction(
  partnerId: string,
  workCenterId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const name = String(values["name"] ?? "").trim();
  if (!name) return { error: "Name is required." };

  const updated = await updateWorkCenter(partnerId, workCenterId, {
    name,
    capacityPerDay: values["capacityPerDay"] === "" || values["capacityPerDay"] == null ? null : Number(values["capacityPerDay"]),
    isActive: values["isActive"] !== false,
  });
  if (!updated) return { error: "Work Center not found." };

  revalidatePath(`/partner/${partnerId}/manufacturing/work-centers`);
  redirect(`/partner/${partnerId}/manufacturing/work-centers`);
}

// ---------------------------------------------------------------------
// Production Orders
// ---------------------------------------------------------------------

export async function createProductionOrderAction(partnerId: string, values: Record<string, unknown>): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const productName = String(values["productName"] ?? "").trim();
  const quantityPlanned = Number(values["quantityPlanned"]) || 0;
  if (!productName) return { error: "Product Name is required." };
  if (quantityPlanned <= 0) return { error: "Enter a valid Quantity Planned." };

  const order = await createProductionOrder(partnerId, {
    productName,
    bomId: values["bomId"] ? String(values["bomId"]) : null,
    quantityPlanned,
    workCenterId: values["workCenterId"] ? String(values["workCenterId"]) : null,
    plannedStartDate: parseDate(values["plannedStartDate"]),
    plannedEndDate: parseDate(values["plannedEndDate"]),
  });

  revalidatePath(`/partner/${partnerId}/manufacturing`);
  redirect(`/partner/${partnerId}/manufacturing/${order.id}`);
}

export async function updateProductionOrderAction(
  partnerId: string,
  orderId: string,
  values: Record<string, unknown>
): Promise<void | { error?: string }> {
  await requireSessionPartnerId(partnerId);
  const productName = String(values["productName"] ?? "").trim();
  const quantityPlanned = Number(values["quantityPlanned"]) || 0;
  if (!productName) return { error: "Product Name is required." };
  if (quantityPlanned <= 0) return { error: "Enter a valid Quantity Planned." };

  const updated = await updateProductionOrder(partnerId, orderId, {
    productName,
    bomId: values["bomId"] ? String(values["bomId"]) : null,
    quantityPlanned,
    workCenterId: values["workCenterId"] ? String(values["workCenterId"]) : null,
    plannedStartDate: parseDate(values["plannedStartDate"]),
    plannedEndDate: parseDate(values["plannedEndDate"]),
  });
  if (!updated) return { error: "Production order not found." };

  revalidatePath(`/partner/${partnerId}/manufacturing`);
  revalidatePath(`/partner/${partnerId}/manufacturing/${orderId}`);
  redirect(`/partner/${partnerId}/manufacturing/${orderId}`);
}

/**
 * Sets a ProductionOrder's status (the stage stepper on the detail page)
 * and records a ProductionStageHistory row. A manual set-to-"Delayed" fires
 * the "productionDelayed" Telegram alert — CLAUDE.md's task scoped the
 * alert to this manual path only; a scheduled check for
 * "plannedEndDate passed while not Completed" would need a new cron route
 * (no existing cron pattern in this repo currently polls ProductionOrder —
 * see src/app/api/cron/* for the nearest analogs, e.g.
 * billing-recurring-invoices) and is left as a deliberate follow-up, not
 * implemented here.
 */
export async function setProductionOrderStatusAction(
  partnerId: string,
  orderId: string,
  status: ProductionOrderStatus
): Promise<{ error?: string }> {
  await requireSessionPartnerId(partnerId);
  const updated = await setProductionOrderStatus(partnerId, orderId, status);
  if (!updated) return { error: "Production order not found." };

  if (status === "Delayed") {
    const partner = await getPartner(partnerId);
    if (partner) {
      const message = await productionDelayedMessage({
        partnerBusinessName: partner.businessName,
        orderId,
        productName: updated.productName,
        quantityPlanned: updated.quantityPlanned,
      });
      await sendPartnerTelegramAlert(partnerId, "productionDelayed", message);
    }
  }

  revalidatePath(`/partner/${partnerId}/manufacturing`);
  revalidatePath(`/partner/${partnerId}/manufacturing/${orderId}`);
  return {};
}

/**
 * Completes production: reads the ProductionOrder's linked BillOfMaterial's
 * BomLines (a real Prisma relation now, not a JSON blob), checks + deducts
 * raw-material stock for every line against "inventory-stock" (fail
 * closed — no partial deduction, same read-check-then-write pattern as
 * before and as completeSaleAction in pos/checkout/actions.ts) via
 * src/lib/inventoryStock.ts UNCHANGED, then updates ProductionOrder.status
 * to "Completed" and inserts a ProductionStageHistory row. Optionally adds
 * the finished good as a new "inventory-stock" item, same as before.
 *
 * Returns { error } instead of throwing so the client component can show a
 * clear inline message (mirrors the "fail closed" UX, not just a crash).
 */
export async function completeProductionAction(
  partnerId: string,
  orderId: string,
  laborCost: number,
  quantityProduced: number
): Promise<{ error?: string }> {
  await requireSessionPartnerId(partnerId);
  const order = await getProductionOrder(partnerId, orderId);
  if (!order) return { error: "Production order not found." };
  if (order.status === "Completed") return { error: "This production order is already completed." };
  if (!order.bom || order.bom.lines.length === 0) {
    return { error: "This production order has no linked Bill of Materials with lines — link a BOM before completing production." };
  }

  const safeLaborCost = Number.isFinite(laborCost) && laborCost >= 0 ? laborCost : 0;
  const safeQuantityProduced = Number.isFinite(quantityProduced) && quantityProduced >= 0 ? quantityProduced : 0;

  // Raw-material stock check — fail closed, no partial deduction. Uses
  // inventoryStock.ts exactly as before; only the source of `lines` changed
  // (real BomLine rows instead of a JSON bomLines blob).
  for (const line of order.bom.lines) {
    const stock = await findStockRecord(partnerId, line.materialId);
    const available = Number(stock?.["qtyOnHand"] ?? 0);
    if (!stock || available < line.quantity) {
      const partner = await getPartner(partnerId);
      if (partner) {
        const message = await productionStockShortfallMessage({
          partnerBusinessName: partner.businessName,
          orderId,
          productName: order.productName,
          materialLabel: line.materialLabel,
          available,
          required: line.quantity,
        });
        await sendPartnerTelegramAlert(partnerId, "productionStockShortfall", message);
      }
      return {
        error: `Insufficient stock for ${line.materialLabel}: ${available} available, ${line.quantity} required.`,
      };
    }
  }
  for (const line of order.bom.lines) {
    await adjustStockQty(partnerId, line.materialId, line.materialLabel, "", -line.quantity);
  }

  const materialCost = order.bom.lines.reduce((sum, l) => sum + l.quantity * (l.unitCost / 100), 0);
  const totalCost = materialCost + safeLaborCost;

  let finishedGoodStockId: string | undefined;
  if (safeQuantityProduced > 0) {
    const finishedGood = await createBusinessRecord(partnerId, "inventory-stock", {
      materialId: `${order.productName} (Finished Good — ${orderId})`,
      warehouseName: "",
      qtyOnHand: safeQuantityProduced,
      reservedQty: 0,
      reorderLevel: 0,
      sourceProductionOrderId: orderId,
    });
    finishedGoodStockId = String(finishedGood.id);
  }

  await setProductionOrderStatus(partnerId, orderId, "Completed", `Quantity produced: ${safeQuantityProduced}. Material cost ₹${Math.round(materialCost)}, labor cost ₹${Math.round(safeLaborCost)}, total ₹${Math.round(totalCost)}.${finishedGoodStockId ? ` Finished-good stock record: ${finishedGoodStockId}.` : ""}`);

  {
    const partner = await getPartner(partnerId);
    if (partner) {
      const message = await productionCompletedMessage({
        partnerBusinessName: partner.businessName,
        orderId,
        productName: order.productName,
        quantityProduced: safeQuantityProduced,
        totalCost: `₹${Math.round(totalCost)}`,
      });
      await sendPartnerTelegramAlert(partnerId, "productionCompleted", message);
    }
  }

  revalidatePath(`/partner/${partnerId}/manufacturing`);
  revalidatePath(`/partner/${partnerId}/manufacturing/${orderId}`);
  revalidatePath(`/partner/${partnerId}/inventory`);
  revalidatePath(`/partner/${partnerId}/inventory/stock`);
  return {};
}
