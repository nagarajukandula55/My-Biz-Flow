import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { AmcFieldServiceClientTable } from "./AmcFieldServiceClientTable";
import { AmcFieldServiceNewButton } from "./AmcFieldServiceNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { amcFieldServiceColumns } from "@/lib/sample-data/amc-field-service";
import {
  listAmcContractsWithVisits,
  extractAmcLifecycle,
  computeSlaBreach,
  computeRenewalDue,
} from "@/lib/amcContractsData";
import type { Column } from "@/components/DataTable";

registerPage({
  id: "amc-field-service.list",
  moduleSlug: "amc-field-service",
  title: "AMC / Field Service — List",
  path: "/partner/[partnerId]/amc-field-service",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
    { key: "view-toggle", label: "List / Kanban view options" },
  ],
  explanation: "Lists every contract record for the amc-field-service module in a sortable table, with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/amc-field-service/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function AmcFieldServicePage({ params }: { params: { partnerId: string } }) {
  const mod = await getModule("amc-field-service");
  const baseColumns = await applyCustomizations("amc-field-service.list", amcFieldServiceColumns);
  const alertsColumn: Column = {
    key: "alerts",
    label: "Alerts",
    type: "select-chip",
    chipVariantMap: { "SLA Breached": "danger", "Renewal Due": "warning" },
  };
  const columns = [...baseColumns, alertsColumn];
  const contracts = await listAmcContractsWithVisits(params.partnerId);
  // SLA-breach and renewal-due are computed server-side at read time, never stored — see computeSlaBreach/computeRenewalDue.
  const rows = contracts.map((c) => {
    const lifecycle = extractAmcLifecycle(c);
    const breached = computeSlaBreach(lifecycle);
    const due = computeRenewalDue(lifecycle);
    const alerts = breached ? "SLA Breached" : due ? "Renewal Due" : "";
    return {
      id: c.id,
      customer: c.customer,
      equipment: c.equipment,
      technicianName: lifecycle.technicianName ?? "",
      contractEndDate: c.contractEndDate.toISOString().slice(0, 10),
      slaHours: c.slaHours,
      contractValue: c.contractValue,
      status: lifecycle.serviceStatus,
      contractStatus: c.contractStatus,
      alerts,
    };
  });

  return (
    <AppShell
      topbarTitle={mod?.label ?? "AMC / Field Service"}
      topbarActions={
        <AmcFieldServiceNewButton partnerId={params.partnerId} />
      }
    >
      <div>
        <p className="text-sm text-text-muted">{mod?.description}</p>
        <div className="mt-6">
          <AmcFieldServiceClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}

