import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { buildGstExportRows, type GstFilter } from "@/lib/gstExport";
import { GstExportDownloadButton } from "./GstExportDownloadButton";

registerPage({
  id: "billing.reports.gst-export",
  moduleSlug: "billing",
  title: "Billing — Reports — GST Export",
  path: "/partner/[partnerId]/billing/reports/gst-export",
  kind: "dashboard",
  superAdminOnly: false,
  customizableRegions: [],
  explanation:
    "Bulk, GST-workpaper-style CSV export of Billing invoices for a date range, split by B2B (customer has a GSTIN on file in billing-contacts) vs B2C (no GSTIN) — meant to make filling a GSTR-1 upload template faster, not a certified portal-exact export. Preview table + a Download CSV button that calls a Server Action returning CSV text, turned into a file download client-side (no new API route).",
  sourceFile: "src/app/partner/[partnerId]/billing/reports/gst-export/page.tsx",
});

export const dynamic = "force-dynamic";

const PREVIEW_COLUMNS: Column[] = [
  { key: "invoiceNumber", label: "Invoice", type: "text" },
  { key: "invoiceDate", label: "Date", type: "date" },
  { key: "customerName", label: "Customer", type: "text" },
  { key: "customerGstin", label: "GSTIN", type: "text" },
  { key: "category", label: "Category", type: "select-chip" },
  { key: "taxableValue", label: "Taxable Value", type: "currency" },
  { key: "cgst", label: "CGST", type: "currency" },
  { key: "sgst", label: "SGST", type: "currency" },
  { key: "igst", label: "IGST", type: "currency" },
  { key: "invoiceValue", label: "Invoice Value", type: "currency" },
];

function defaultRange(): { from: string; to: string } {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: first.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10) };
}

export default async function GstExportPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams?: { from?: string; to?: string; filter?: string };
}) {
  const fallback = defaultRange();
  const from = searchParams?.from || fallback.from;
  const to = searchParams?.to || fallback.to;
  const filter: GstFilter = searchParams?.filter === "b2b" || searchParams?.filter === "b2c" ? searchParams.filter : "all";

  const rows = await buildGstExportRows(params.partnerId, from, to, filter);
  const previewRows: Row[] = rows.map((r) => ({ ...r }));

  return (
    <AppShell topbarTitle="GST Export">
      <div>
        <p className="text-sm text-text-muted">
          A GST-workpaper-style bulk export of Billing invoices for a date range — B2B rows carry the customer&apos;s
          GSTIN (matched from Contacts), B2C rows don&apos;t. Not a certified GSTR-1 portal template; use it as a
          starting point for your return.
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">From</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">To</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm font-mono text-text outline-none focus:border-teal"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-muted">Category</span>
            <select
              name="filter"
              defaultValue={filter}
              className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-teal"
            >
              <option value="all">Both B2B &amp; B2C</option>
              <option value="b2b">B2B only</option>
              <option value="b2c">B2C only</option>
            </select>
          </label>
          <button type="submit" className="btn-outline">Apply</button>
        </form>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-text-muted">
            {rows.length} invoice{rows.length === 1 ? "" : "s"} in range.
          </p>
          <GstExportDownloadButton partnerId={params.partnerId} from={from} to={to} filter={filter} />
        </div>

        <div className="mt-4">
          <DataTable columns={PREVIEW_COLUMNS} rows={previewRows} />
        </div>
      </div>
    </AppShell>
  );
}
