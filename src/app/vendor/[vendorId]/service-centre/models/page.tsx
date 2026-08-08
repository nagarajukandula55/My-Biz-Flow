import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ScModelClientTable } from "./ScModelClientTable";
import { ScModelNewButton } from "./ScModelNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scModelColumns } from "@/lib/sample-data/service-centre-models";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.models.list",
  moduleSlug: "service-centre",
  title: "Device Models — List",
  path: "/vendor/[vendorId]/service-centre/models",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Vendor-owned model catalog for the service-centre module — used when creating a workorder.",
  sourceFile: "src/app/vendor/[vendorId]/service-centre/models/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScModelListPage({ params }: { params: { vendorId: string } }) {
  const columns = await applyCustomizations("service-centre.models.list", scModelColumns);
  const rows = await listBusinessRecords(params.vendorId, "service-centre-models");

  return (
    <AppShell topbarTitle="Device Models" topbarActions={<ScModelNewButton vendorId={params.vendorId} />}>
      <div>
        <div className="mt-2">
          <ScModelClientTable vendorId={params.vendorId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
