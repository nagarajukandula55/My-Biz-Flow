import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { ScCustomerClientTable } from "./ScCustomerClientTable";
import { ScCustomerNewButton } from "./ScCustomerNewButton";
import { CustomerDataOtpGate } from "./CustomerDataOtpGate";
import { CustomerDataExportButton } from "./CustomerDataExportButton";
import { LockCustomerDataButton } from "./LockCustomerDataButton";
import { applyCustomizations } from "@/lib/designer/customizations";
import { customersColumns } from "@/lib/sample-data/service-centre-customers";
import { listServiceCentrePage } from "@/lib/serviceCentreListData";
import { loadCustomerExportRows } from "../exportActions";
import { isCustomerDataUnlocked } from "@/lib/customerDataAccess";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

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
  explanation: "Partner-owned customer directory for the service-centre module — a standing record of who a partner's customers are, independent of any single workorder. Viewing/exporting this list requires a fresh Telegram-delivered one-time code (CustomerDataOtpGate, src/lib/customerDataAccess.ts) since it's private customer contact data — a 30-minute unlock, not a permanent one.",
  sourceFile: "src/app/partner/[partnerId]/service-centre/customers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ScCustomerListPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const tierGate = await renderTierGate(params.partnerId, "service-centre.customers.list", "Customers");
  if (tierGate) return <AppShell topbarTitle={"Customers"}>{tierGate}</AppShell>;

  const unlocked = await isCustomerDataUnlocked(params.partnerId);
  if (!unlocked) {
    return (
      <AppShell topbarTitle="Customers">
        <CustomerDataOtpGate partnerId={params.partnerId} />
      </AppShell>
    );
  }

  const columns = await applyCustomizations("service-centre.customers.list", customersColumns);
  const { rows, total, totalPages, pageSize, page } = await listServiceCentrePage(params.partnerId, "service-centre-customers", searchParams.page);

  return (
    <AppShell
      topbarTitle="Customers"
      topbarActions={
        <div className="flex items-center gap-3">
          <LockCustomerDataButton partnerId={params.partnerId} />
          <CustomerDataExportButton columns={columns} loadRows={loadCustomerExportRows.bind(null, params.partnerId)} />
          <ScCustomerNewButton partnerId={params.partnerId} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <ScCustomerClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
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
