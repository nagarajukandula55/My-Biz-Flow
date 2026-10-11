import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { PartOrdersClientTable } from "./PartOrdersClientTable";
import { PartOrdersNewButton } from "./PartOrdersNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportPartOrdersAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { partOrderColumns, getPartOrderFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { listBusinessRecordsPaginated } from "@/lib/businessRecords";
import { PaginationControls, buildPageQueryString } from "@/components/PaginationControls";

registerPage({
  id: "inventory.part-orders.list",
  moduleSlug: "inventory",
  title: "Part Orders — List",
  path: "/partner/[partnerId]/inventory/part-orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation: "Lists every part order (warehouse dispatching replacement material), with a \"+ New\" action to create one and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/part-orders/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PartOrdersPage({
  params,
  searchParams,
}: {
  params: { partnerId: string };
  searchParams: { page?: string };
}) {
  const columns = await applyCustomizations("inventory.part-orders.list", partOrderColumns);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { rows, total, totalPages, pageSize } = await listBusinessRecordsPaginated(params.partnerId, "inventory-part-orders", { page });
  const formFields = await getPartOrderFormFields(params.partnerId);
  const materialOptions = await getBomOptionsForPartner(params.partnerId);

  return (
    <AppShell
      topbarTitle="Part Orders"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Part Orders"
            columns={formFields.map((f) => f.key)}
            requiredColumnsNote="Material, Quantity, Source Warehouse and Status are required per row."
            sampleRow={["", "USB-C Charging Port Flex Cable", "5", "Central Warehouse — Bengaluru", "Indiranagar Service Centre", "Pending", ""]}
            templateFilename="part-orders-template.csv"
            importAction={bulkImportPartOrdersAction.bind(null, params.partnerId)}
          />
          <PartOrdersNewButton partnerId={params.partnerId} fields={formFields} materialOptions={materialOptions} />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <PartOrdersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
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
