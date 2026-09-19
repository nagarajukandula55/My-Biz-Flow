/**
 * Pure helpers for the GST bulk-export feature (see
 * src/app/api/gst-export/route.ts, the Route Handler that calls these to
 * build the downloadable ZIP) — used from both that route and the export
 * page's own preview table (a plain server component).
 *
 * Exports a single ZIP containing:
 *  - gst-export.json — every invoice with the CGST Rule 46 fields a GST
 *    return/reconciliation actually needs (place of supply + state code,
 *    reverse charge, per-invoice CGST/SGST/IGST split), not just a flat
 *    CSV-shaped row set.
 *  - gst-export.xlsx — the same rows as a real spreadsheet (via the
 *    `xlsx` package), for whoever needs to hand this to an accountant
 *    rather than a script.
 *
 * Not a certified GSTR-1 portal upload template — this is a workpaper
 * export to make preparing one faster, same caveat as before.
 */
import { listBusinessRecords } from "@/lib/businessRecords";
import { getPartner } from "@/lib/partnerData";
import { normalizeState, stateCodeOf } from "@/lib/gstStateCodes";

export type GstFilter = "all" | "b2b" | "b2c";

export type GstExportRow = {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: "B2B" | "B2C";
  customerName: string;
  customerGstin: string;
  customerStateCode: string;
  /** Recipient's own state for a registered (B2B) customer, else the supplier's — IGST Act s.12(2). */
  placeOfSupply: string;
  placeOfSupplyStateCode: string;
  /** Always "N" — Billing/Service Centre never raise a reverse-charge-applicable supply. */
  reverseCharge: "Y" | "N";
  taxableValue: number;
  /** Approximate — Billing invoices store an invoice-level tax total, not a per-line rate/HSN breakup. */
  taxRate: number;
  cgstRate: number;
  cgst: number;
  sgstRate: number;
  sgst: number;
  igstRate: number;
  igst: number;
  totalTax: number;
  invoiceValue: number;
};

function inRange(date: string, from?: string, to?: string): boolean {
  if (!date) return true;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function buildGstExportRows(
  partnerId: string,
  from: string,
  to: string,
  filter: GstFilter
): Promise<GstExportRow[]> {
  const [invoices, partner] = await Promise.all([
    listBusinessRecords(partnerId, "billing"),
    getPartner(partnerId),
  ]);
  const supplierState = partner?.state ?? "";

  const rows: GstExportRow[] = [];
  for (const inv of invoices) {
    const issueDate = String(inv["issueDate"] ?? "");
    if (!inRange(issueDate, from, to)) continue;

    // Read the invoice's own stored customer fields directly (set at
    // creation/edit — see billing/[recordId]/edit/page.tsx) rather than
    // re-deriving GSTIN/state from a fuzzy name match against Contacts,
    // which silently produced blanks for any walk-in or renamed customer.
    const customerGstin = String(inv["customerGstin"] ?? "").trim();
    const customerState = String(inv["customerState"] ?? "").trim();
    const invoiceType: "B2B" | "B2C" = customerGstin ? "B2B" : "B2C";
    if (filter === "b2b" && invoiceType !== "B2B") continue;
    if (filter === "b2c" && invoiceType !== "B2C") continue;

    const interState =
      normalizeState(customerState) !== "" &&
      normalizeState(supplierState) !== "" &&
      normalizeState(customerState) !== normalizeState(supplierState);

    const taxableValue = Number(inv["subtotal"] ?? 0) - Number(inv["discountAmount"] ?? 0);
    const totalTax = Number(inv["taxAmount"] ?? 0);
    const taxRate = taxableValue > 0 ? round2((totalTax / taxableValue) * 100) : 0;

    const placeOfSupply = customerState || supplierState;

    rows.push({
      invoiceNumber: String(inv["id"] ?? ""),
      invoiceDate: issueDate,
      invoiceType,
      customerName: String(inv["customer"] ?? ""),
      customerGstin,
      customerStateCode: stateCodeOf(customerState) ?? "",
      placeOfSupply,
      placeOfSupplyStateCode: stateCodeOf(placeOfSupply) ?? "",
      reverseCharge: "N",
      taxableValue: round2(taxableValue),
      taxRate,
      cgstRate: interState ? 0 : round2(taxRate / 2),
      cgst: interState ? 0 : round2(totalTax / 2),
      sgstRate: interState ? 0 : round2(taxRate / 2),
      sgst: interState ? 0 : round2(totalTax - totalTax / 2),
      igstRate: interState ? taxRate : 0,
      igst: interState ? round2(totalTax) : 0,
      totalTax: round2(totalTax),
      invoiceValue: round2(Number(inv["totalAmount"] ?? 0)),
    });
  }

  rows.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));
  return rows;
}

export type GstExportJson = {
  supplier: {
    gstin: string;
    state: string;
    stateCode: string;
  };
  exportedAt: string;
  from: string;
  to: string;
  filter: GstFilter;
  invoiceCount: number;
  invoices: GstExportRow[];
};

export async function buildGstExportJson(
  partnerId: string,
  from: string,
  to: string,
  filter: GstFilter
): Promise<GstExportJson> {
  const [rows, partner] = await Promise.all([
    buildGstExportRows(partnerId, from, to, filter),
    getPartner(partnerId),
  ]);
  return {
    supplier: {
      gstin: partner?.gstin ?? "",
      state: partner?.state ?? "",
      stateCode: stateCodeOf(partner?.state) ?? "",
    },
    exportedAt: new Date().toISOString(),
    from,
    to,
    filter,
    invoiceCount: rows.length,
    invoices: rows,
  };
}

const XLSX_HEADERS: { key: keyof GstExportRow; label: string }[] = [
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "invoiceType", label: "Invoice Type" },
  { key: "customerName", label: "Customer Name" },
  { key: "customerGstin", label: "Customer GSTIN" },
  { key: "customerStateCode", label: "Customer State Code" },
  { key: "placeOfSupply", label: "Place of Supply" },
  { key: "placeOfSupplyStateCode", label: "Place of Supply State Code" },
  { key: "reverseCharge", label: "Reverse Charge" },
  { key: "taxableValue", label: "Taxable Value" },
  { key: "taxRate", label: "Tax Rate (%)" },
  { key: "cgstRate", label: "CGST Rate (%)" },
  { key: "cgst", label: "CGST Amount" },
  { key: "sgstRate", label: "SGST Rate (%)" },
  { key: "sgst", label: "SGST Amount" },
  { key: "igstRate", label: "IGST Rate (%)" },
  { key: "igst", label: "IGST Amount" },
  { key: "totalTax", label: "Total Tax" },
  { key: "invoiceValue", label: "Invoice Value" },
];

/** Builds the "Invoices" sheet's rows as plain objects keyed by header label — what XLSX.utils.json_to_sheet expects. */
export function gstRowsToSheetData(rows: GstExportRow[]): Record<string, string | number>[] {
  return rows.map((r) => {
    const out: Record<string, string | number> = {};
    for (const h of XLSX_HEADERS) out[h.label] = r[h.key];
    return out;
  });
}
