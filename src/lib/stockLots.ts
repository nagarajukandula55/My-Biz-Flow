/**
 * Per-unit/per-batch stock lot library — the substrate for FIFO draw
 * order, serialized exact-ageing, and (future) barcode/lot lookups. Backed
 * by the StockLot table (see prisma/schema.prisma). This is a
 * foundations-only file for this stage: nothing calls createStockLots yet
 * from an actual inbound point (a later stage wires it in from wherever
 * stock is first received — Stock Take reconciling upward, Stock
 * Transfers/Part Orders receiving, etc).
 *
 * Deliberately builds on top of src/lib/inventoryStock.ts's
 * materialId/condition conventions rather than duplicating them: a lot's
 * `materialId` is the bare code (materialCode()'s output there), and
 * `condition` is the same "Good" | "Defective" bucket. Pre-existing stock
 * predates lot tracking entirely, so FIFO draws here are best-effort — see
 * consumeFifo's doc comment.
 */
import { prisma } from "@/lib/prisma";
import type { StockCondition } from "@/lib/inventoryStock";

export type CreateStockLotInput = {
  partnerId: string;
  warehouseId: string;
  warehouseName: string;
  materialId: string;
  materialLabel: string;
  condition: StockCondition;
  serialized: boolean;
  /** Required when serialized; one lot row is created per serial number, each 1/1. Ignored (must be omitted/empty) when not serialized. */
  serialNumbers?: string[];
  /** Total quantity received for a non-serialized material (ignored when serialized — quantity is implied by serialNumbers.length). */
  quantity?: number;
  /** Paise, per unit. */
  unitCost: number;
  receivedAt?: Date;
  sourceType?: string;
  sourceRecordId?: string;
};

/**
 * Creates one or more StockLot rows for a single receipt event. A
 * serialized material gets one row per unit (quantityReceived/
 * quantityRemaining = 1/1); a non-serialized material gets a single batch
 * row for the whole quantity. Returns the created rows' ids.
 */
export async function createStockLots(input: CreateStockLotInput): Promise<string[]> {
  const receivedAt = input.receivedAt ?? new Date();
  const base = {
    partnerId: input.partnerId,
    warehouseId: input.warehouseId,
    warehouseName: input.warehouseName,
    materialId: input.materialId,
    materialLabel: input.materialLabel,
    condition: input.condition,
    unitCost: input.unitCost,
    receivedAt,
    sourceType: input.sourceType ?? null,
    sourceRecordId: input.sourceRecordId ?? null,
  };

  if (input.serialized) {
    const serials = input.serialNumbers ?? [];
    if (serials.length === 0) return [];
    const created = await prisma.$transaction(
      serials.map((serialNumber) =>
        prisma.stockLot.create({
          data: {
            ...base,
            serialized: true,
            serialNumber,
            quantityReceived: 1,
            quantityRemaining: 1,
          },
        })
      )
    );
    return created.map((row) => row.id);
  }

  const quantity = input.quantity ?? 0;
  if (quantity <= 0) return [];
  const row = await prisma.stockLot.create({
    data: {
      ...base,
      serialized: false,
      serialNumber: null,
      quantityReceived: quantity,
      quantityRemaining: quantity,
    },
  });
  return [row.id];
}

export type ConsumeFifoResult = {
  /** Quantity actually drawn from tracked lots — may be less than requested when tracked lots don't cover it (pre-existing/untracked stock). */
  consumed: number;
  /** requested - consumed. > 0 means lot tracking couldn't fully account for this draw. */
  shortfall: number;
  lotsTouched: { lotId: string; quantityDrawn: number; serialNumber: string | null }[];
};

/**
 * FIFO draw: consumes `quantity` units of a material from the oldest
 * (by receivedAt) untracked-remaining lots first. Non-serialized lots draw
 * partially (quantityRemaining decremented, consumedAt stamped only once
 * it hits 0); serialized lots are always drawn whole-unit (quantityRemaining
 * 1 -> 0, consumedAt stamped immediately).
 *
 * Best-effort: if the tracked lots for this material/warehouse/condition
 * don't cover the full requested quantity (e.g. because the stock predates
 * lot tracking, or previous consumption wasn't drawn through this
 * function), this does NOT throw — it draws whatever it can and reports
 * the gap as `shortfall`. Callers that need a hard guarantee should check
 * `getQtyOnHand` (src/lib/inventoryStock.ts) themselves; this function's
 * job is best-effort ageing/FIFO bookkeeping, not the authoritative
 * on-hand quantity gate.
 */
export async function consumeFifo(
  partnerId: string,
  materialId: string,
  warehouseId: string,
  condition: StockCondition,
  quantity: number
): Promise<ConsumeFifoResult> {
  if (quantity <= 0) return { consumed: 0, shortfall: 0, lotsTouched: [] };

  const lots = await prisma.stockLot.findMany({
    where: { partnerId, materialId, warehouseId, condition, quantityRemaining: { gt: 0 } },
    orderBy: { receivedAt: "asc" },
  });

  let remaining = quantity;
  const lotsTouched: ConsumeFifoResult["lotsTouched"] = [];

  for (const lot of lots) {
    if (remaining <= 0) break;
    const draw = Math.min(lot.quantityRemaining, remaining);
    if (draw <= 0) continue;
    const nextRemaining = lot.quantityRemaining - draw;
    await prisma.stockLot.update({
      where: { id: lot.id },
      data: {
        quantityRemaining: nextRemaining,
        ...(nextRemaining === 0 ? { consumedAt: new Date() } : {}),
      },
    });
    lotsTouched.push({ lotId: lot.id, quantityDrawn: draw, serialNumber: lot.serialNumber });
    remaining -= draw;
  }

  const consumed = quantity - remaining;
  if (remaining > 0) {
    console.warn(
      `[stockLots] consumeFifo: partner ${partnerId} material ${materialId} warehouse ${warehouseId} (${condition}) — requested ${quantity}, only ${consumed} covered by tracked lots. Shortfall ${remaining} likely predates lot tracking.`
    );
  }

  return { consumed, shortfall: remaining, lotsTouched };
}

export type AgeingLotDetail = {
  lotId: string;
  serialNumber: string | null;
  quantity: number;
  receivedAt: string;
  ageDays: number;
};

export type MaterialAgeingReport = {
  materialId: string;
  warehouseId: string;
  condition: StockCondition;
  /** Serialized: one entry per remaining unit, exact age. Non-serialized: one entry per remaining lot layer. */
  lots: AgeingLotDetail[];
  totalQuantity: number;
  /** Quantity-weighted average age across all remaining lots/units. */
  averageAgeDays: number;
  oldestAgeDays: number | null;
};

function ageDaysFrom(receivedAt: Date, now: Date): number {
  return Math.floor((now.getTime() - receivedAt.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Ageing report for one material/warehouse/condition bucket, built purely
 * from remaining StockLot rows (quantityRemaining > 0). Serialized
 * materials get exact per-unit age (one lot row per unit already); non-
 * serialized materials get FIFO-layered lot ages plus a quantity-weighted
 * average. Returns an empty report (not an error) when no tracked lots
 * exist for this bucket — callers falling back to the aggregate Stock-row
 * "days since last replenished" (src/lib/inventoryStock.ts) should do so
 * when `lots` comes back empty, since that means this bucket predates lot
 * tracking entirely.
 */
export async function getAgeingReport(
  partnerId: string,
  materialId: string,
  warehouseId: string,
  condition: StockCondition
): Promise<MaterialAgeingReport> {
  const lots = await prisma.stockLot.findMany({
    where: { partnerId, materialId, warehouseId, condition, quantityRemaining: { gt: 0 } },
    orderBy: { receivedAt: "asc" },
  });

  const now = new Date();
  let totalQuantity = 0;
  let weightedAgeSum = 0;
  let oldestAgeDays: number | null = null;

  const details: AgeingLotDetail[] = lots.map((lot) => {
    const ageDays = ageDaysFrom(lot.receivedAt, now);
    totalQuantity += lot.quantityRemaining;
    weightedAgeSum += ageDays * lot.quantityRemaining;
    if (oldestAgeDays === null || ageDays > oldestAgeDays) oldestAgeDays = ageDays;
    return {
      lotId: lot.id,
      serialNumber: lot.serialNumber,
      quantity: lot.quantityRemaining,
      receivedAt: lot.receivedAt.toISOString(),
      ageDays,
    };
  });

  return {
    materialId,
    warehouseId,
    condition,
    lots: details,
    totalQuantity,
    averageAgeDays: totalQuantity > 0 ? weightedAgeSum / totalQuantity : 0,
    oldestAgeDays,
  };
}
