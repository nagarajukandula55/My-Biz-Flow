import type { Row } from "@/components/DataTable";
import type { SaleLine, Tender } from "@/lib/sample-data/pos";

export function validatePosInput(input: { lines: SaleLine[]; tenders: Tender[] }): void {
  if (!Array.isArray(input.lines) || !input.lines.length) throw new Error("Cart is empty.");
  for (const line of input.lines) {
    if (!line || !line.sku || !Number.isFinite(line.qty) || line.qty <= 0 ||
      !Number.isFinite(line.unitPrice) || line.unitPrice < 0 ||
      !Number.isFinite(line.discount) || line.discount < 0 || line.discount > line.qty * line.unitPrice ||
      !Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100 || !Number.isFinite(line.qty * line.unitPrice)) {
      throw new Error("Invalid sale quantity, price, discount or tax rate.");
    }
  }
  if (!Array.isArray(input.tenders) || !input.tenders.length || input.tenders.some(tender =>
    !tender || !["Cash", "UPI", "Card", "Wallet"].includes(tender.method) || !Number.isFinite(tender.amount) || tender.amount < 0)) {
    throw new Error("Invalid payment tender.");
  }
}

/** Aggregate repeated SKU lines before checking stock; reserved/defective stock is not sellable. */
export function planPosStock(stock: Row[], lines: SaleLine[]): { id: string; data: Row }[] {
  const wanted = new Map<string, number>();
  for (const line of lines) wanted.set(line.sku, (wanted.get(line.sku) ?? 0) + line.qty);
  return Array.from(wanted, ([id, quantity]) => {
    const row = stock.find(row => String(row.id) === id);
    const onHand = Number(row?.qtyOnHand ?? 0), reserved = Number(row?.reservedQty ?? 0);
    const available = Math.min(onHand - reserved, Number(row?.availableQty ?? onHand - reserved));
    if (!row || row.condition === "Defective" || !Number.isFinite(quantity) || quantity <= 0 ||
      !Number.isFinite(onHand) || !Number.isFinite(reserved) || reserved < 0 || !Number.isFinite(available) || available < quantity) {
      throw new Error(`Insufficient or invalid sellable stock for ${id}.`);
    }
    return { id, data: { ...row, qtyOnHand: onHand - quantity, availableQty: Math.max(0, onHand - quantity - reserved) } };
  });
}
