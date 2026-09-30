/**
 * A BOM material counts as Active unless its status is explicitly something
 * else ("Inactive", …). Compared trimmed + case-insensitively, and a blank or
 * missing status counts as Active. The BOM CSV importer stores `status`
 * exactly as typed, so a row uploaded with "active" / " Active" / an empty
 * cell used to show in the BOM list (which lists everything) but vanish from
 * every picker that required `status === "Active"` exactly — Stock
 * Adjustments, Return/Part Orders, Stock Take/Transfer, invoice line items.
 */
export function isActiveMaterial(record: Record<string, unknown>): boolean {
  const status = String(record["status"] ?? "").trim().toLowerCase();
  return status === "" || status === "active";
}
