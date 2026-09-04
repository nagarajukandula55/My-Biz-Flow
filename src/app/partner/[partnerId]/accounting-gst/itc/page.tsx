import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { GstItcClientTable } from "./GstItcClientTable";
import { GstItcNewButton } from "./GstItcNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { gstItcColumns } from "@/lib/sample-data/accounting-gst-itc";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "accounting-gst.itc.list",
  moduleSlug: "accounting-gst",
  title: "GST — ITC Register",
  path: "/partner/[partnerId]/accounting-gst/itc",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every Input Tax Credit (ITC) entry from partner bills, with a \"+ New\" action and row-click navigation into the record's detail view. Eligible entries for a period feed that period's GSTR-3B ITC Claimed figure (see the Generate GST Return flow).",
  sourceFile: "src/app/partner/[partnerId]/accounting-gst/itc/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function GstItcPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("accounting-gst.itc.list", gstItcColumns);
  const rows = await listBusinessRecords(params.partnerId, "accounting-gst-itc");

  return (
    <AppShell
      topbarTitle="ITC Register"
      topbarActions={<GstItcNewButton partnerId={params.partnerId} />}
    >
      <div>
        <p className="text-sm text-text-muted">Input Tax Credit entries from partner bills — the purchase side of GST compliance.</p>
        <div className="mt-4">
          <GstItcClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
