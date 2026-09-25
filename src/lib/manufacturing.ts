/**
 * Manufacturing's Prisma-backed data layer — BillOfMaterial/BomLine,
 * WorkCenter, ProductionOrder/ProductionStageHistory (see
 * prisma/schema.prisma). Replaces the old free-text "BOM Reference" +
 * JSON `bomLines` blob that lived directly on a "manufacturing"
 * BusinessRecord (src/lib/sample-data/manufacturing.ts) — that file/module
 * slug is no longer written to by this module. Raw-material stock
 * deduction itself is UNCHANGED and still goes through
 * src/lib/inventoryStock.ts (see completeProductionAction in
 * src/app/partner/[partnerId]/manufacturing/actions.ts) — this file only
 * owns the BOM/ProductionOrder data model.
 *
 * Every read/write here is partner-scoped by an explicit `partnerId: ...`
 * where clause (assertPartnerScope's convention — see src/lib/tenant.ts),
 * same as src/lib/fieldForce/bookingsData.ts.
 */
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------
// Bill of Materials
// ---------------------------------------------------------------------

export type BomLineRecord = {
  id: string;
  bomId: string;
  materialId: string;
  materialLabel: string;
  quantity: number;
  unitCost: number; // paise
};

export type BomRecord = {
  id: string;
  partnerId: string;
  productName: string;
  productCode: string | null;
  version: number;
  isActive: boolean;
  createdAt: Date;
  lines: BomLineRecord[];
};

export async function listBoms(partnerId: string): Promise<BomRecord[]> {
  return prisma.billOfMaterial.findMany({
    where: { partnerId },
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBom(partnerId: string, id: string): Promise<BomRecord | null> {
  const bom = await prisma.billOfMaterial.findFirst({
    where: { id, partnerId },
    include: { lines: true },
  });
  return bom;
}

export type BomLineInput = { materialId: string; materialLabel: string; quantity: number; unitCost: number };

export async function createBom(
  partnerId: string,
  input: { productName: string; productCode?: string; isActive?: boolean; lines: BomLineInput[] }
): Promise<BomRecord> {
  const bom = await prisma.billOfMaterial.create({
    data: {
      partnerId,
      productName: input.productName,
      productCode: input.productCode || null,
      isActive: input.isActive ?? true,
      lines: { create: input.lines.map((l) => ({ ...l })) },
    },
    include: { lines: true },
  });
  return bom;
}

/** Replaces the BOM's header fields and its full line set (delete + recreate — simplest correct approach for a small per-BOM line list, same "replace wholesale" shape createReturnOrdersMultiAction-style multi-line forms already use client-side). */
export async function updateBom(
  partnerId: string,
  id: string,
  input: { productName: string; productCode?: string; isActive?: boolean; lines: BomLineInput[] }
): Promise<BomRecord | null> {
  const existing = await prisma.billOfMaterial.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  await prisma.$transaction([
    prisma.bomLine.deleteMany({ where: { bomId: id } }),
    prisma.billOfMaterial.update({
      where: { id },
      data: {
        productName: input.productName,
        productCode: input.productCode || null,
        isActive: input.isActive ?? true,
        version: { increment: 1 },
        lines: { create: input.lines.map((l) => ({ ...l })) },
      },
    }),
  ]);
  return getBom(partnerId, id);
}

// ---------------------------------------------------------------------
// Work Centers
// ---------------------------------------------------------------------

export type WorkCenterRecord = {
  id: string;
  partnerId: string;
  name: string;
  capacityPerDay: number | null;
  isActive: boolean;
};

export async function listWorkCenters(partnerId: string): Promise<WorkCenterRecord[]> {
  return prisma.workCenter.findMany({ where: { partnerId }, orderBy: { name: "asc" } });
}

export async function getWorkCenter(partnerId: string, id: string): Promise<WorkCenterRecord | null> {
  return prisma.workCenter.findFirst({ where: { id, partnerId } });
}

export async function createWorkCenter(
  partnerId: string,
  input: { name: string; capacityPerDay?: number | null; isActive?: boolean }
): Promise<WorkCenterRecord> {
  return prisma.workCenter.create({
    data: { partnerId, name: input.name, capacityPerDay: input.capacityPerDay ?? null, isActive: input.isActive ?? true },
  });
}

export async function updateWorkCenter(
  partnerId: string,
  id: string,
  input: { name: string; capacityPerDay?: number | null; isActive?: boolean }
): Promise<WorkCenterRecord | null> {
  const existing = await prisma.workCenter.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  return prisma.workCenter.update({
    where: { id },
    data: { name: input.name, capacityPerDay: input.capacityPerDay ?? null, isActive: input.isActive ?? true },
  });
}

// ---------------------------------------------------------------------
// Production Orders
// ---------------------------------------------------------------------

/** Planned | InProduction | QC | Completed | Delayed — matches the comment on ProductionOrder.status in prisma/schema.prisma. */
export const PRODUCTION_ORDER_STATUSES = ["Planned", "InProduction", "QC", "Completed", "Delayed"] as const;
export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];

export type ProductionStageHistoryRecord = {
  id: string;
  productionOrderId: string;
  stage: string;
  enteredAt: Date;
  note: string | null;
};

export type ProductionOrderRecord = {
  id: string;
  partnerId: string;
  bomId: string | null;
  bomProductName: string | null;
  productName: string;
  quantityPlanned: number;
  quantityProduced: number;
  workCenterId: string | null;
  workCenterName: string | null;
  status: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualCompletionDate: Date | null;
  createdAt: Date;
};

function toProductionOrderRecord(row: {
  id: string;
  partnerId: string;
  bomId: string | null;
  bom: { productName: string } | null;
  productName: string;
  quantityPlanned: number;
  quantityProduced: number;
  workCenterId: string | null;
  workCenter: { name: string } | null;
  status: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualCompletionDate: Date | null;
  createdAt: Date;
}): ProductionOrderRecord {
  return {
    id: row.id,
    partnerId: row.partnerId,
    bomId: row.bomId,
    bomProductName: row.bom?.productName ?? null,
    productName: row.productName,
    quantityPlanned: row.quantityPlanned,
    quantityProduced: row.quantityProduced,
    workCenterId: row.workCenterId,
    workCenterName: row.workCenter?.name ?? null,
    status: row.status,
    plannedStartDate: row.plannedStartDate,
    plannedEndDate: row.plannedEndDate,
    actualCompletionDate: row.actualCompletionDate,
    createdAt: row.createdAt,
  };
}

const PRODUCTION_ORDER_INCLUDE = { bom: { select: { productName: true } }, workCenter: { select: { name: true } } } as const;

export async function listProductionOrders(partnerId: string): Promise<ProductionOrderRecord[]> {
  const rows = await prisma.productionOrder.findMany({
    where: { partnerId },
    include: PRODUCTION_ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toProductionOrderRecord);
}

export type ProductionOrderDetail = ProductionOrderRecord & {
  bom: BomRecord | null;
  stageHistory: ProductionStageHistoryRecord[];
};

export async function getProductionOrder(partnerId: string, id: string): Promise<ProductionOrderDetail | null> {
  const row = await prisma.productionOrder.findFirst({
    where: { id, partnerId },
    include: {
      ...PRODUCTION_ORDER_INCLUDE,
      stageHistory: { orderBy: { enteredAt: "asc" } },
    },
  });
  if (!row) return null;
  const bom = row.bomId ? await getBom(partnerId, row.bomId) : null;
  return { ...toProductionOrderRecord(row), bom, stageHistory: row.stageHistory };
}

export async function createProductionOrder(
  partnerId: string,
  input: {
    productName: string;
    bomId?: string | null;
    quantityPlanned: number;
    workCenterId?: string | null;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
  }
): Promise<ProductionOrderRecord> {
  const created = await prisma.productionOrder.create({
    data: {
      partnerId,
      productName: input.productName,
      bomId: input.bomId || null,
      quantityPlanned: input.quantityPlanned,
      workCenterId: input.workCenterId || null,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      status: "Planned",
    },
    include: PRODUCTION_ORDER_INCLUDE,
  });
  await prisma.productionStageHistory.create({
    data: { productionOrderId: created.id, stage: "Planned", note: "Production order created." },
  });
  return toProductionOrderRecord(created);
}

export async function updateProductionOrder(
  partnerId: string,
  id: string,
  input: {
    productName: string;
    bomId?: string | null;
    quantityPlanned: number;
    workCenterId?: string | null;
    plannedStartDate?: Date | null;
    plannedEndDate?: Date | null;
  }
): Promise<ProductionOrderRecord | null> {
  const existing = await prisma.productionOrder.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  const updated = await prisma.productionOrder.update({
    where: { id },
    data: {
      productName: input.productName,
      bomId: input.bomId || null,
      quantityPlanned: input.quantityPlanned,
      workCenterId: input.workCenterId || null,
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
    },
    include: PRODUCTION_ORDER_INCLUDE,
  });
  return toProductionOrderRecord(updated);
}

/**
 * Advances/sets a ProductionOrder's status and records the transition on
 * ProductionStageHistory (the real audit trail — see CLAUDE.md's "Complete
 * Production must ... insert a ProductionStageHistory row"). Telegram
 * "production delayed" alerting for a manual set-to-Delayed lives in the
 * caller (setProductionOrderStatusAction in actions.ts) since sending an
 * alert is a module-action concern, not a bare data-layer one — mirrors
 * how sendWorkorderTelegramAlert is called from actions.ts elsewhere, not
 * from inside a data file.
 */
export async function setProductionOrderStatus(
  partnerId: string,
  id: string,
  status: ProductionOrderStatus,
  note?: string
): Promise<ProductionOrderRecord | null> {
  const existing = await prisma.productionOrder.findFirst({ where: { id, partnerId } });
  if (!existing) return null;
  const updated = await prisma.productionOrder.update({
    where: { id },
    data: {
      status,
      ...(status === "Completed" ? { actualCompletionDate: new Date() } : {}),
    },
    include: PRODUCTION_ORDER_INCLUDE,
  });
  await prisma.productionStageHistory.create({
    data: { productionOrderId: id, stage: status, note: note ?? null },
  });
  return toProductionOrderRecord(updated);
}
