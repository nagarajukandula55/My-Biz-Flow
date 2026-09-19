"use server";

import * as XLSX from "xlsx";
import JSZip from "jszip";
import { requireSessionPartnerId } from "@/lib/requirePartnerSession";
import { buildGstExportJson, gstRowsToSheetData, type GstFilter } from "@/lib/gstExport";

export type { GstFilter };

/**
 * Server Action invoked by the client "Download GST Export (ZIP)" button —
 * returns a base64-encoded ZIP (the standard Next.js "Server Action
 * returns data, client does the Blob" pattern — no new API route). The
 * ZIP contains:
 *  - gst-export.json — every invoice with the full set of GST-required
 *    fields (see gstExport.ts's GstExportRow), for anyone reconciling
 *    programmatically or feeding another tool.
 *  - gst-export.xlsx — the same rows as a real spreadsheet, built with
 *    the `xlsx` package, for handing to an accountant.
 */
export async function downloadGstExportZipAction(
  partnerId: string,
  from: string,
  to: string,
  filter: GstFilter
): Promise<{ zipBase64: string; filename: string; count: number }> {
  await requireSessionPartnerId(partnerId);
  const json = await buildGstExportJson(partnerId, from, to, filter);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(gstRowsToSheetData(json.invoices));
  XLSX.utils.book_append_sheet(workbook, sheet, "Invoices");
  const xlsxBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const zip = new JSZip();
  zip.file("gst-export.json", JSON.stringify(json, null, 2));
  zip.file("gst-export.xlsx", xlsxBuffer);
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  const label = filter === "all" ? "all" : filter;
  const filename = `gst-export-${label}-${from || "start"}-to-${to || "end"}.zip`;
  return { zipBase64: zipBuffer.toString("base64"), filename, count: json.invoiceCount };
}
