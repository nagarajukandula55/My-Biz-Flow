import { NextRequest, NextResponse } from "next/server";
import { requireSessionPartnerId, PartnerAuthorizationError } from "@/lib/requirePartnerSession";
import { buildGstExportJson, gstRowsToSheetData, type GstFilter } from "@/lib/gstExport";

/**
 * The GST Export ZIP is built here, in its own Route Handler, rather than
 * as a Server Action living in a shared lib file. Reason: src/lib/rbac.ts
 * (imported by every /partner/[partnerId]/* page via PartnerLayout) pulls
 * in src/lib/designer/registerAll.ts, which side-effect-imports EVERY
 * registered page's module — including this feature's own page.tsx. If
 * that page.tsx (or anything it imports, like the old Server Action file)
 * touched `xlsx`/`jszip` at module scope, those sizeable packages would
 * get traced into the Serverless Function bundle of every single partner
 * route in the app, not just this one page — which is exactly what made
 * Vercel's Function storage spike after they were added. Isolating the
 * actual `xlsx`/`jszip` imports to this standalone route means only THIS
 * function's bundle carries that weight.
 *
 * `export const runtime` defaults to "nodejs", which both packages need
 * (xlsx's buffer output, jszip's zlib use) — Edge runtime would not work.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const partnerId = searchParams.get("partnerId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const filterParam = searchParams.get("filter");
  const filter: GstFilter = filterParam === "b2b" || filterParam === "b2c" ? filterParam : "all";

  try {
    await requireSessionPartnerId(partnerId);
  } catch (err) {
    const message = err instanceof PartnerAuthorizationError ? err.message : "Not authorized.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const json = await buildGstExportJson(partnerId, from, to, filter);
  if (json.invoiceCount === 0) {
    return NextResponse.json({ error: "No invoices match this date range / filter.", count: 0 }, { status: 200 });
  }

  // Dynamic imports keep xlsx/jszip out of this route's top-level module
  // graph too, so `next build`'s trace only pulls them in for requests
  // that actually reach this branch — not that it matters much once
  // they're already isolated to this one route, but it costs nothing.
  const [{ default: JSZip }, XLSX] = await Promise.all([import("jszip"), import("xlsx")]);

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

  return new NextResponse(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
