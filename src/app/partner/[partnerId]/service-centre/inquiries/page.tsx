import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { InquiryClientTable } from "./InquiryClientTable";
import { InquiryNewButton } from "./InquiryNewButton";
import { RecordCsvExportButton } from "@/components/RecordCsvExportButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { inquiryColumns } from "@/lib/sample-data/service-centre-inquiry";
import { listBusinessRecords, listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

registerPage({
  id: "service-centre.inquiries.list",
  moduleSlug: "service-centre",
  title: "Inquiries — List",
  path: "/partner/[partnerId]/service-centre/inquiries",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation:
    "Inquiries logged before a workorder exists — staff-entered, or auto-created by the public, no-login Book Appointment form and auto-assigned to this partner by serviceable area. Row-click opens the detail view, where staff accept/convert to a workorder or close with a reason.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/inquiries/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function InquiryListPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const columns = await applyCustomizations("service-centre.inquiries.list", inquiryColumns);
  const page = Math.max(1, Number(searchParams.page) || 1);
  // Two reads: the CSV export must offer every inquiry, not just the
  // current page, while the table only renders one page at a time.
  const [allRows, { rows, total, totalPages, pageSize }] = await Promise.all([
    listBusinessRecords(params.partnerId, "service-centre-inquiry"),
    listBusinessRecordsPaginated(params.partnerId, "service-centre-inquiry", { page }),
  ]);

  return (
    <AppShell
      topbarTitle="Inquiries"
      topbarActions={
        <div className="flex items-center gap-3">
          <RecordCsvExportButton
            columns={columns.map((c) => ({ key: c.key, type: c.type === "date" ? "date" : c.type === "datetime" ? "datetime" : undefined }))}
            rows={allRows}
            filename={`inquiries-${params.partnerId}-${new Date().toISOString().slice(0, 10)}.csv`}
          />
          <InquiryNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <InquiryClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
        <PaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          buildHref={(p) => buildPageQueryString(searchParams, { page: String(p) })}
        />
      </div>
    </AppShell>
  );
}
