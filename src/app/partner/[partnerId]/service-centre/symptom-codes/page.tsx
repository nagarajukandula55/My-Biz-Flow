import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ScSymptomCodeClientTable } from "./ScSymptomCodeClientTable";
import { ScSymptomCodeNewButton } from "./ScSymptomCodeNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { scSymptomCodeColumns } from "@/lib/sample-data/service-centre-symptom-codes";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.symptom-codes.list",
  moduleSlug: "service-centre",
  title: "Symptom Codes — List",
  path: "/partner/[partnerId]/service-centre/symptom-codes",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Partner-owned catalog of observed symptoms (distinct from underlying fault causes) selected per-line on a workorder's Parts & Service Lines.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/symptom-codes/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScSymptomCodeListPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("service-centre.symptom-codes.list", scSymptomCodeColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-symptom-codes");

  return (
    <AppShell topbarTitle="Symptom Codes" topbarActions={<ScSymptomCodeNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <ScSymptomCodeClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
