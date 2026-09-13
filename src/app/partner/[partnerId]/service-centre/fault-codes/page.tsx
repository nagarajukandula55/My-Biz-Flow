import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ScFaultCodeClientTable } from "./ScFaultCodeClientTable";
import { ScFaultCodeNewButton } from "./ScFaultCodeNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scFaultCodeColumns } from "@/lib/sample-data/service-centre-fault-codes";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.fault-codes.list",
  moduleSlug: "service-centre",
  title: "Fault Codes — List",
  path: "/partner/[partnerId]/service-centre/fault-codes",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Partner-owned catalog of underlying fault causes (distinct from observed symptoms) selected per-line on a workorder's Parts & Service Lines.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/fault-codes/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScFaultCodeListPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("service-centre.fault-codes.list", scFaultCodeColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-fault-codes");

  return (
    <AppShell topbarTitle="Fault Codes" topbarActions={<ScFaultCodeNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <ScFaultCodeClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
