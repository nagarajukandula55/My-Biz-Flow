import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { InquiryClientTable } from "./InquiryClientTable";
import { InquiryNewButton } from "./InquiryNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { inquiryColumns } from "@/lib/sample-data/service-centre-inquiry";
import { listBusinessRecords } from "@/lib/businessRecords";

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

export default async function InquiryListPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("service-centre.inquiries.list", inquiryColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-inquiry");

  return (
    <AppShell topbarTitle="Inquiries" topbarActions={<InquiryNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <InquiryClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
