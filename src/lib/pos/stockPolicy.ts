import type { Row } from "@/components/DataTable";
import type { SaleLine, Tender } from "@/lib/sample-data/pos";

export function validatePosInput(input: { lines: SaleLine[]; tenders: Tender[] }): void {
  const validMoney = (value: number) => Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  if (!Array.isArray(input.lines) || !input.lines.length) throw new Error("Cart is empty.");
  for (const line of input.lines) {
    if (!line || !line.sku || !Number.isSafeInteger(line.qty) || line.qty <= 0 ||
      !validMoney(line.unitPrice) ||
      !validMoney(line.discount) || line.discount > line.qty * line.unitPrice ||
      !Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100 || !Number.isFinite(line.qty * line.unitPrice)) {
      throw new Error("Invalid sale quantity, price, discount or tax rate.");
    }
    if (line.serialNumber && (line.qty !== 1 || !line.serialLotId)) {
      throw new Error("A serialized unit must be sold once and include its stock identity.");
    }
  }
  if (!Array.isArray(input.tenders) || !input.tenders.length || input.tenders.some(tender =>
    !tender || !["Cash", "UPI", "Card", "Wallet"].includes(tender.method) || !validMoney(tender.amount))) {
    throw new Error("Invalid payment tender.");
  }
}

/** Net receipts after cash change; each row is what the Billing payment history actually received. */
export function allocatePosPayments(tenders: Tender[], totalAmount: number): { method: Tender["method"]; amount: number }[] {
  const tenderedPaise = tenders.reduce((sum, tender) => sum + Math.round(tender.amount * 100), 0);
  const totalPaise = Math.round(totalAmount * 100);
  let changePaise = tenderedPaise - totalPaise;
  if (changePaise < 0) throw new Error("Payment is less than the sale total.");
  if (changePaise > tenders.filter((t) => t.method === "Cash").reduce((sum, tender) => sum + Math.round(tender.amount * 100), 0)) {
    throw new Error("Change cannot exceed cash tendered.");
  }
  const receipts = tenders.map((tender) => {
    const tenderPaise = Math.round(tender.amount * 100);
    const cashChange = tender.method === "Cash" ? Math.min(changePaise, tenderPaise) : 0;
    changePaise -= cashChange;
    return { method: tender.method, amount: (tenderPaise - cashChange) / 100 };
  }).filter((receipt) => receipt.amount > 0);
  if (changePaise !== 0 || receipts.reduce((sum, receipt) => sum + Math.round(receipt.amount * 100), 0) !== totalPaise) {
    throw new Error("Recorded payments do not match the sale total.");
  }
  return receipts;
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
