/**
 * Pure helpers for the GST bulk-export feature (see gstExportActions.ts
 * for the Server Actions that call these) — kept in a separate,
 * non-"use server" module because a "use server" file may only export
 * async functions, and buildGstExportRows/gstRowsToCsv are used from both
 * the export page (a plain server component) and the download action.
 *
 * See gstExportActions.ts's top comment for the full rationale on the
 * B2B/B2C join and the CGST/SGST/IGST split's judgement call.
 */
import { listBusinessRecords } from "@/lib/businessRecords";

export type GstFilter = "all" | "b2b" | "b2c";

export type GstExportRow = {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceValue: number;
  category: "B2B" | "B2C";
};

function inRange(date: string, from?: string, to?: string): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const CSV_HEADERS = [
  "Invoice Number",
  "Invoice Date",
  "Customer Name",
  "Customer GSTIN",
  "Taxable Value",
  "CGST Amount",
  "SGST Amount",
  "IGST Amount",
  "Total Tax",
  "Invoice Value",
  "Category",
];

export async function buildGstExportRows(
  partnerId: string,
  from: string,
  to: string,
  filter: GstFilter
): Promise<GstExportRow[]> {
  const [invoices, contacts] = await Promise.all([
    listBusinessRecords(partnerId, "billing"),
    listBusinessRecords(partnerId, "billing-contacts"),
  ]);

  const gstinByName = new Map<string, string>();
  for (const c of contacts) {
    const name = String(c["name"] ?? "").trim();
    const gstin = String(c["gstin"] ?? "").trim();
    if (name && gstin) gstinByName.set(name, gstin);
  }

  const rows: GstExportRow[] = [];
  for (const inv of invoices) {
    const issueDate = String(inv["issueDate"] ?? "");
    if (!inRange(issueDate, from, to)) continue;

    const customerName = String(inv["customer"] ?? "");
    const gstin = gstinByName.get(customerName) ?? "";
    const category: "B2B" | "B2C" = gstin ? "B2B" : "B2C";
    if (filter === "b2b" && category !== "B2B") continue;
    if (filter === "b2c" && category !== "B2C") continue;

    const taxableValue = Number(inv["subtotal"] ?? 0) - Number(inv["discountAmount"] ?? 0);
    const totalTax = Number(inv["taxAmount"] ?? 0);
    const half = Math.round((totalTax / 2) * 100) / 100;

    rows.push({
      invoiceNumber: String(inv["id"] ?? ""),
      invoiceDate: issueDate,
      customerName,
      customerGstin: gstin,
      taxableValue,
      cgst: half,
      sgst: totalTax - half,
      igst: 0,
      totalTax,
      invoiceValue: Number(inv["totalAmount"] ?? 0),
      category,
    });
  }

  rows.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
  return rows;
}

export function gstRowsToCsv(rows: GstExportRow[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.invoiceNumber),
        csvEscape(r.invoiceDate),
        csvEscape(r.customerName),
        csvEscape(r.customerGstin),
        csvEscape(r.taxableValue),
        csvEscape(r.cgst),
        csvEscape(r.sgst),
        csvEscape(r.igst),
        csvEscape(r.totalTax),
        csvEscape(r.invoiceValue),
        csvEscape(r.category),
      ].join(",")
    );
  }
  return lines.join("\n");
}
