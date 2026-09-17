import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { ScCustomerClientTable } from "./ScCustomerClientTable";
import { ScCustomerNewButton } from "./ScCustomerNewButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { customersColumns } from "@/lib/sample-data/service-centre-customers";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "service-centre.customers.list",
  moduleSlug: "service-centre",
  title: "Customers — List",
  path: "/partner/[partnerId]/service-centre/customers",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Partner-owned customer directory for the service-centre module — a standing record of who a partner's customers are, independent of any single workorder.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/customers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScCustomerListPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.customers.list", "Customers");
  if (tierGate) return <AppShell topbarTitle={"Customers"}>{tierGate}</AppShell>;

  const columns = await applyCustomizations("service-centre.customers.list", customersColumns);
  const rows = await listBusinessRecords(params.partnerId, "service-centre-customers");

  return (
    <AppShell topbarTitle="Customers" topbarActions={<ScCustomerNewButton partnerId={params.partnerId} />}>
      <div>
        <div className="mt-2">
          <ScCustomerClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
