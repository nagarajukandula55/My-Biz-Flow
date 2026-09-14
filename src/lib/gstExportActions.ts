"use server";

import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { buildGstExportRows, gstRowsToCsv, type GstFilter } from "@/lib/gstExport";

export type { GstFilter };

/**
 * Server Action invoked by the client "Download CSV" button — returns the
 * CSV text, which the client turns into a Blob and downloads via a plain
 * `<a download>` link. No new API route: this is the standard Next.js
 * Server-Action-returns-a-string, client-does-the-Blob pattern. See
 * src/lib/gstExport.ts for the row-building/CSV logic and the judgement
 * calls behind the B2B/B2C split and the CGST/SGST/IGST columns.
 */
export async function downloadGstExportAction(
  partnerId: string,
  from: string,
  to: string,
  filter: GstFilter
): Promise<{ csv: string; filename: string; count: number }> {
  await requireSessionPartnerId(partnerId);
  const rows = await buildGstExportRows(partnerId, from, to, filter);
  const csv = gstRowsToCsv(rows);
  const label = filter === "all" ? "all" : filter;
  const filename = `gst-export-${label}-${from || "start"}-to-${to || "end"}.csv`;
  return { csv, filename, count: rows.length };
}
