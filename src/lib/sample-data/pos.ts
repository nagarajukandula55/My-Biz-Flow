import type { Column, Row } from "@/components/DataTable";
import type { RecordField, TimelineEntry, RelatedRecord } from "@/components/RecordDetail";
import type { StatusVariant } from "@/components/StatusChip";
import type { FormFieldDef } from "@/components/RecordForm";

// POS sale field modeling for the pos module — a sale is a real multi-item
// cart transaction (see PosCheckout.tsx), not a single flat product row.

const STATUS_VARIANT: Record<string, StatusVariant> = {
  Completed: "success",
  Draft: "neutral",
  Voided: "danger",
};

const TENDER_VARIANT: Record<string, StatusVariant> = {
  Cash: "success",
  UPI: "teal",
  Card: "amber",
  Wallet: "neutral",
};

export type SaleLine = {
  id: string;
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  taxRate: number; // % — carried per line so mixed-tax-rate baskets work
  discount: number; // flat amount off this line
};

export type Tender = { method: "Cash" | "UPI" | "Card" | "Wallet"; amount: number };

export type PosSaleStatus = "Draft" | "Completed" | "Voided";

export type PosSale = {
  status: PosSaleStatus;
  lines: SaleLine[];
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  totalAmount: number;
  tenders: Tender[];
  amountTendered: number;
  changeDue: number;
  cashier?: string;
  branch?: string;
  /** Guards against double-deducting Inventory stock on a retried completion. */
  stockDeducted: boolean;
  invoiceId?: string;
  voidedAt?: string;
  voidReason?: string;
};

/** Server-computed from cart lines — never trust client-submitted totals. */
export function computeSaleTotals(lines: SaleLine[]): {
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  totalAmount: number;
} {
  let subtotal = 0;
  let taxAmount = 0;
  let discountTotal = 0;
  for (const line of lines) {
    const gross = line.qty * line.unitPrice;
    const net = Math.max(0, gross - (line.discount || 0));
    subtotal += net;
    taxAmount += net * ((line.taxRate || 0) / 100);
    discountTotal += line.discount || 0;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    subtotal: round(subtotal),
    taxAmount: round(taxAmount),
    discountTotal: round(discountTotal),
    totalAmount: round(subtotal + taxAmount),
  };
}

export function extractSaleFromRecord(record: Row): PosSale {
  return {
    status: (record["status"] as PosSaleStatus | undefined) ?? "Draft",
    lines: (record["lines"] as SaleLine[] | undefined) ?? [],
    subtotal: Number(record["subtotal"] ?? 0),
    taxAmount: Number(record["taxAmount"] ?? 0),
    discountTotal: Number(record["discountTotal"] ?? 0),
    totalAmount: Number(record["totalAmount"] ?? 0),
    tenders: (record["tenders"] as Tender[] | undefined) ?? [],
    amountTendered: Number(record["amountTendered"] ?? 0),
    changeDue: Number(record["changeDue"] ?? 0),
    cashier: record["cashier"] as string | undefined,
    branch: record["branch"] as string | undefined,
    stockDeducted: Boolean(record["stockDeducted"]),
    invoiceId: record["invoiceId"] as string | undefined,
    voidedAt: record["voidedAt"] as string | undefined,
    voidReason: record["voidReason"] as string | undefined,
  };
}

export const posColumns: Column[] = [
  { key: "id", label: "Receipt Number", type: "text" },
  { key: "lineCount", label: "Items", type: "text" },
  { key: "totalAmount", label: "Total", type: "currency" },
  { key: "paymentSummary", label: "Payment", type: "text" },
  { key: "status", label: "Status", type: "select-chip", chipVariantMap: STATUS_VARIANT },
  { key: "cashier", label: "Cashier", type: "text" },
  { key: "branch", label: "Branch", type: "text" },
  { key: "transactionTimestamp", label: "Transaction Time", type: "date" },
];

/**
 * No create/edit form fields — checkout (pos/checkout/PosCheckout.tsx) is
 * a real cart UI, not the generic RecordForm every other module still
 * uses. Kept as an empty export so fieldSchema.ts's MODULE_SCHEMA map
 * (which every module registers into) still type-checks; the Designer
 * simply has nothing to customize for pos.create/pos.edit since those
 * pages no longer exist.
 */
export const posFormFields: FormFieldDef[] = [];

export const posRows: Row[] = [
  {
    id: "RCPT-10231",
    lineCount: 2,
    totalAmount: 682,
    paymentSummary: "UPI",
    status: "Completed",
    cashier: "Meena R.",
    branch: "Koramangala",
    transactionTimestamp: "2026-08-07T10:12:00",
  },
  {
    id: "RCPT-10230",
    lineCount: 1,
    totalAmount: 67,
    paymentSummary: "Cash",
    status: "Completed",
    cashier: "Arjun D.",
    branch: "Indiranagar",
    transactionTimestamp: "2026-08-07T09:58:00",
  },
  {
    id: "RCPT-10229",
    lineCount: 3,
    totalAmount: 940,
    paymentSummary: "Cash + Card",
    status: "Completed",
    cashier: "Meena R.",
    branch: "Koramangala",
    transactionTimestamp: "2026-08-06T18:44:00",
  },
  {
    id: "RCPT-10228",
    lineCount: 1,
    totalAmount: 499,
    paymentSummary: "Wallet",
    status: "Voided",
    cashier: "Ravi K.",
    branch: "HSR Layout",
    transactionTimestamp: "2026-08-06T17:20:00",
  },
];

export function getPosRecord(recordId: string): Row {
  return posRows.find((r) => String(r["id"]) === recordId) ?? posRows[0];
}

export function getPosDetailFields(record: Row): RecordField[] {
  const r = record;
  return [
    { label: "Receipt Number", value: r["id"], type: "text" },
    { label: "Items", value: r["lineCount"], type: "text" },
    { label: "Total", value: r["totalAmount"], type: "currency" },
    { label: "Payment", value: r["paymentSummary"], type: "text", chipVariant: TENDER_VARIANT[String(r["paymentSummary"])] ?? "neutral" },
    { label: "Status", value: r["status"], type: "select", chipVariant: STATUS_VARIANT[String(r["status"])] ?? "neutral" },
    { label: "Cashier", value: r["cashier"], type: "text" },
    { label: "Branch", value: r["branch"], type: "text" },
    { label: "Transaction Time", value: r["transactionTimestamp"], type: "date" },
  ];
}

export function getPosTimeline(record: Row): TimelineEntry[] {
  return [
    { id: "t1", label: "Sale rung up at register by " + (record["cashier"] ?? "cashier"), timestamp: String(record["transactionTimestamp"] ?? ""), actor: String(record["cashier"] ?? "") },
    { id: "t2", label: "Stock decremented for each line item", timestamp: String(record["transactionTimestamp"] ?? ""), actor: "System" },
    { id: "t3", label: `Payment captured (${record["paymentSummary"] ?? "—"}), Billing invoice created`, timestamp: String(record["transactionTimestamp"] ?? ""), actor: "System" },
  ];
}

export const posRelated: RelatedRecord[] = [];
