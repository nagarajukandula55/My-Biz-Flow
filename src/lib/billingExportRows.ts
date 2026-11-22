import type { Row } from "@/components/DataTable";

/**
 * Produces export/display-ready sales-invoice rows. `id` is an internal
 * record key used for navigation; `invoiceNumber` is the customer-facing,
 * immutable document number. Linked workorders already use their Job/RO
 * number as the key, so this gives exports a clearly labelled reference
 * rather than an implementation-oriented `sourceWorkorderId` column.
 */
export function prepareBillingExportRows(rows: Row[]): Row[] {
  return rows.map(({ sourceWorkorderId, ...row }) => ({
    ...row,
    invoiceNumber: String(row["invoiceNumber"] ?? row["id"] ?? ""),
    workorderNumber: String(sourceWorkorderId ?? ""),
  }));
}
