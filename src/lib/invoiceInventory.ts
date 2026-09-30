/**
 * "Consume from Inventory" support for a manually created Sales Invoice.
 *
 * A line opts in with `consumeInventory: true` (the per-line toggle in
 * LineItemsEditor). Lines without it are invoiced without touching stock.
 * Opted-in lines are checked fail-closed — nothing is deducted and no invoice
 * is created unless EVERY opted-in line can be covered by Good, unreserved
 * stock (availableQty) — then deducted across warehouses (largest first) and
 * logged to the same "inventory-consumption" history a workorder deduction
 * writes, so Inventory > Parts Consumption shows it.
 *
 * Both steps must run under the "inventory-partner" withRecordLock so the plan
 * and the deduction see the same stock.
 */
import { createBusinessRecord, listBusinessRecords } from "@/lib/businessRecords";
import { adjustStockQty } from "@/lib/inventoryStock";

export type InvoiceConsumption = {
  materialId: string;
  /** The stock row's own stored materialId label ("CODE — Description"). */
  materialLabel: string;
  warehouseName: string;
  qty: number;
};

export type InvoiceConsumptionPlan = {
  error?: string;
  allocations: InvoiceConsumption[];
  /** Indexes of invoice lines that will be deducted. */
  consumedLineIndexes: number[];
};

type RawLine = Record<string, unknown>;

function materialCode(value: unknown): string {
  return String(value ?? "").split(" — ")[0].trim();
}

function asLines(items: unknown): RawLine[] {
  return Array.isArray(items) ? (items as RawLine[]) : [];
}

export function hasInventoryLines(items: unknown): boolean {
  return asLines(items).some((l) => l?.["consumeInventory"] === true);
}

export async function planInvoiceConsumption(partnerId: string, items: unknown): Promise<InvoiceConsumptionPlan> {
  const lines = asLines(items);
  const wanted: { index: number; code: string; description: string; qty: number }[] = [];
  lines.forEach((line, index) => {
    if (line?.["consumeInventory"] !== true) return;
    wanted.push({
      index,
      code: String(line["itemId"] ?? "").trim(),
      description: String(line["description"] ?? "").trim() || `line ${index + 1}`,
      qty: Number(line["quantity"] ?? 0),
    });
  });
  if (wanted.length === 0) return { allocations: [], consumedLineIndexes: [] };

  for (const w of wanted) {
    if (!w.code) return fail(`"${w.description}": pick a catalog item to consume it from Inventory.`);
    if (!Number.isFinite(w.qty) || w.qty <= 0) return fail(`"${w.description}": quantity must be greater than 0 to consume from Inventory.`);
  }

  const [bomRows, stockRows] = await Promise.all([
    listBusinessRecords(partnerId, "inventory-bom"),
    listBusinessRecords(partnerId, "inventory-stock"),
  ]);
  const bomById = new Map(bomRows.map((r) => [String(r["id"]), r]));

  // The same material on two lines draws from one shared pool of stock.
  const needByCode = new Map<string, { qty: number; description: string }>();
  for (const w of wanted) {
    const bom = bomById.get(w.code);
    if (!bom) return fail(`"${w.description}": ${w.code} is not in the Material Catalog (BOM).`);
    if (bom["serialized"]) {
      return fail(`"${w.description}" is a serialized material — consume it through a Stock Adjustment or a Service Centre workorder so its serial numbers are tracked.`);
    }
    const prev = needByCode.get(w.code);
    needByCode.set(w.code, { qty: (prev?.qty ?? 0) + w.qty, description: prev?.description ?? w.description });
  }

  const allocations: InvoiceConsumption[] = [];
  for (const [code, { qty: needed, description }] of needByCode) {
    const rows = stockRows
      .filter((r) => r["condition"] !== "Defective" && materialCode(r["materialId"]) === code)
      .map((r) => ({ row: r, available: Number(r["availableQty"] ?? r["qtyOnHand"] ?? 0) }))
      .filter((r) => r.available > 0)
      .sort((a, b) => b.available - a.available);
    const totalAvailable = rows.reduce((sum, r) => sum + r.available, 0);
    if (totalAvailable < needed) {
      return fail(`Not enough stock for "${description}" — ${totalAvailable} available, ${needed} needed. Untick "Deduct from inventory" on that line or reduce the quantity.`);
    }
    let remaining = needed;
    for (const { row, available } of rows) {
      if (remaining <= 0) break;
      const take = Math.min(available, remaining);
      allocations.push({
        materialId: code,
        materialLabel: String(row["materialId"] ?? code),
        warehouseName: String(row["warehouseName"] ?? ""),
        qty: take,
      });
      remaining -= take;
    }
  }

  return { allocations, consumedLineIndexes: wanted.map((w) => w.index) };
}

function fail(error: string): InvoiceConsumptionPlan {
  return { error, allocations: [], consumedLineIndexes: [] };
}

/** Returns the invoice's items ready to persist: the request flag is dropped and each deducted line is stamped `inventoryConsumed`. */
export function finalizeInvoiceItems(items: unknown, consumedLineIndexes: number[]): RawLine[] {
  const consumed = new Set(consumedLineIndexes);
  return asLines(items).map((line, index) => {
    // Both flags are server-owned: drop whatever the client sent, then stamp only what was really deducted.
    const { consumeInventory: _flag, inventoryConsumed: _stamp, ...rest } = line;
    return consumed.has(index) ? { ...rest, inventoryConsumed: true } : rest;
  });
}

export async function applyInvoiceConsumption(
  partnerId: string,
  invoice: { id: string; number: string; customer: string },
  allocations: InvoiceConsumption[]
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  for (const a of allocations) {
    await adjustStockQty(partnerId, a.materialId, a.materialLabel, a.warehouseName, -a.qty);
    await createBusinessRecord(partnerId, "inventory-consumption", {
      workorderId: invoice.number || invoice.id,
      source: "Sales Invoice",
      invoiceId: invoice.id,
      materialId: a.materialId,
      materialLabel: a.materialLabel,
      warehouseName: a.warehouseName,
      qty: a.qty,
      serial: "",
      customerName: invoice.customer,
      consumedDate: today,
    });
  }
}
