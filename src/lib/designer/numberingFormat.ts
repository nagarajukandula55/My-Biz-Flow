/**
 * Pure numbering-format logic, split out from numbering.ts for the same
 * reason renderTemplate.ts was split from documentTemplates.ts: a Client
 * Component (NumberingSchemeEditor's live preview) needs formatNumber()
 * without pulling node:fs/node:path into the browser bundle.
 */

export type Separator = "-" | "/" | "." | "none";
export type FinancialYearFormat = "none" | "YY-YY" | "YYYY-YY" | "YYYYYY";

export type NumberingScheme = {
  prefix: string;
  separator: Separator;
  financialYearFormat: FinancialYearFormat;
  sequenceDigits: number; // zero-padding width, e.g. 4 -> 0007
  sequenceStart: number;
  suffix: string;
  /**
   * Optional token template, e.g. "{prefix}{yyyy}{mm}{dd}{seq}" — when set,
   * this REPLACES the structured prefix/fy/seq/suffix + separator building
   * below entirely, so a scheme can produce formats the structured fields
   * can't express (e.g. AN-CRM's own "WO202609150001": prefix + full
   * YYYYMMDD + a 4-digit running sequence, no separators at all — not
   * expressible via financialYearFormat, which only ever renders a
   * financial-year string, never a literal calendar date).
   * Available tokens: {prefix} {suffix} {seq} {fy} {yyyy} {yy} {mm} {dd}.
   * An unrecognized {token} is left as literal text rather than stripped,
   * so a typo is visible in the live preview instead of silently vanishing.
   */
  template?: string;
};

export const DEFAULT_SCHEME: NumberingScheme = {
  prefix: "INV",
  separator: "-",
  financialYearFormat: "YY-YY",
  sequenceDigits: 4,
  sequenceStart: 1,
  suffix: "",
};

/** The document types that currently have a document page — see DESIGN_SYSTEM.md §5. */
export const NUMBERED_DOCUMENT_TYPES = [
  { id: "billing.document", label: "Invoice (Billing)" },
  { id: "billing.invoice.b2c", label: "B2C Invoice (Billing)" },
  { id: "billing.invoice.b2b", label: "B2B Invoice (Billing)" },
  { id: "service-centre.document", label: "Job Card (Service Centre)" },
  { id: "service-centre.workorder", label: "Workorder / Job ID (Service Centre)" },
  { id: "service-centre.brand", label: "Brand Code (Service Centre)" },
  { id: "service-centre.model", label: "Model Code (Service Centre)" },
  { id: "inventory.bom-material", label: "Material Code (BOM)" },
  { id: "service-centre.invoice", label: "Sales Invoice (Service Centre)" },
  { id: "service-centre.invoice.b2c", label: "B2C Sales Invoice (Service Centre)" },
  { id: "service-centre.invoice.b2b", label: "B2B Sales Invoice (Service Centre)" },
  { id: "pos.document", label: "Receipt (POS)" },
  { id: "amc-field-service.document", label: "Service Report (AMC/Field Service)" },
  { id: "legal.document", label: "Engagement Letter (Legal)" },
  { id: "field-force.booking", label: "Booking (Field Force)" },
] as const;

/** India runs its financial year April 1 -> March 31. */
export function getFinancialYear(date: Date, format: FinancialYearFormat): string {
  if (format === "none") return "";
  const month = date.getMonth() + 1; // 1-12
  const startYear = month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  const endYear = startYear + 1;
  switch (format) {
    case "YY-YY":
      return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
    case "YYYY-YY":
      return `${startYear}-${String(endYear).slice(-2)}`;
    case "YYYYYY":
      return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    default:
      return "";
  }
}

const SEPARATOR_CHAR: Record<Separator, string> = { "-": "-", "/": "/", ".": ".", none: "" };

export function formatNumber(scheme: NumberingScheme, sequence: number, date: Date = new Date()): string {
  const fy = getFinancialYear(date, scheme.financialYearFormat);
  const paddedSeq = String(sequence).padStart(scheme.sequenceDigits, "0");

  if (scheme.template?.trim()) {
    const tokens: Record<string, string> = {
      prefix: scheme.prefix,
      suffix: scheme.suffix,
      seq: paddedSeq,
      fy,
      yyyy: String(date.getFullYear()),
      yy: String(date.getFullYear()).slice(-2),
      mm: String(date.getMonth() + 1).padStart(2, "0"),
      dd: String(date.getDate()).padStart(2, "0"),
    };
    return scheme.template.replace(/\{(\w+)\}/g, (match, key: string) => (key in tokens ? tokens[key] : match));
  }

  const sep = SEPARATOR_CHAR[scheme.separator];
  const parts = [scheme.prefix, fy, paddedSeq].filter((p) => p !== "");
  return parts.join(sep) + (scheme.suffix ? sep + scheme.suffix : "");
}
