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
};

export const DEFAULT_SCHEME: NumberingScheme = {
  prefix: "INV",
  separator: "-",
  financialYearFormat: "YY-YY",
  sequenceDigits: 4,
  sequenceStart: 1,
  suffix: "",
};

/** The 5 document types that currently have a document page — see DESIGN_SYSTEM.md §5. */
export const NUMBERED_DOCUMENT_TYPES = [
  { id: "billing.document", label: "Invoice (Billing)" },
  { id: "service-centre.document", label: "Job Card (Service Centre)" },
  { id: "pos.document", label: "Receipt (POS)" },
  { id: "amc-field-service.document", label: "Service Report (AMC/Field Service)" },
  { id: "legal.document", label: "Engagement Letter (Legal)" },
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
  const sep = SEPARATOR_CHAR[scheme.separator];
  const fy = getFinancialYear(date, scheme.financialYearFormat);
  const paddedSeq = String(sequence).padStart(scheme.sequenceDigits, "0");

  const parts = [scheme.prefix, fy, paddedSeq].filter((p) => p !== "");
  return parts.join(sep) + (scheme.suffix ? sep + scheme.suffix : "");
}
