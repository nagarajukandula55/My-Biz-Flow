import type { Row } from "@/components/DataTable";
import type { LineItem } from "@/lib/sample-data/billing";

/** "2026-08-15" -> "2026-08" */
export function periodKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Last N period keys (including the current one), newest first — for a period picker. */
export function recentPeriodKeys(count = 12): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function periodLabel(periodKey: string): string {
  const [y, m] = periodKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** GSTR-1 due the 11th, GSTR-3B due the 20th, of the month *after* the filing period. */
export function gstDueDates(periodKey: string): { gstr1: string; gstr3b: string } {
  const [y, m] = periodKey.split("-").map(Number);
  const nextMonth = new Date(y, m, 1); // JS Date month is 0-based, so `m` (1-based) here lands on the next month
  const yyyy = nextMonth.getFullYear();
  const mm = String(nextMonth.getMonth() + 1).padStart(2, "0");
  return { gstr1: `${yyyy}-${mm}-11`, gstr3b: `${yyyy}-${mm}-20` };
}

/** Outward-supply figures (what GSTR-1/3B's taxable value + tax liability come from) for a set of Billing invoices already filtered to one period. */
export type OutwardSupplyTotals = { taxableValue: number; taxLiability: number; totalAmount: number; invoiceCount: number };

export function computeOutwardSupply(invoices: Row[]): OutwardSupplyTotals {
  return invoices.reduce<OutwardSupplyTotals>(
    (acc, inv) => ({
      taxableValue: acc.taxableValue + (Number(inv["subtotal"]) || 0),
      taxLiability: acc.taxLiability + (Number(inv["taxAmount"]) || 0),
      totalAmount: acc.totalAmount + (Number(inv["totalAmount"]) || 0),
      invoiceCount: acc.invoiceCount + 1,
    }),
    { taxableValue: 0, taxLiability: 0, totalAmount: 0, invoiceCount: 0 }
  );
}

export type HsnSummaryRow = {
  hsnSac: string;
  taxRate: number;
  taxableValue: number;
  taxAmount: number;
  invoiceCount: number;
};

/** GSTR-1's HSN-wise summary table: every invoice line item, grouped by (HSN/SAC, tax rate). Looks up HSN/SAC via the line's itemId against the Billing Items catalog — a freehand line with no itemId is grouped under "Unspecified". */
export function computeHsnSummary(invoices: Row[], items: Row[]): HsnSummaryRow[] {
  const hsnByItemId = new Map(items.map((it) => [String(it["id"]), String(it["hsnSac"] ?? "")]));
  const groups = new Map<string, HsnSummaryRow>();

  for (const inv of invoices) {
    const invoiceItems = (inv["items"] as LineItem[] | undefined) ?? [];
    for (const line of invoiceItems) {
      const hsnSac = (line.itemId && hsnByItemId.get(line.itemId)) || "Unspecified";
      const taxRate = line.taxRate ?? 0;
      const key = `${hsnSac}::${taxRate}`;
      const lineValue = line.quantity * line.unitPrice;
      const lineTax = lineValue * (taxRate / 100);
      const entry = groups.get(key) ?? { hsnSac, taxRate, taxableValue: 0, taxAmount: 0, invoiceCount: 0 };
      entry.taxableValue += lineValue;
      entry.taxAmount += lineTax;
      entry.invoiceCount += 1;
      groups.set(key, entry);
    }
  }

  return [...groups.values()].sort((a, b) => a.hsnSac.localeCompare(b.hsnSac) || a.taxRate - b.taxRate);
}
