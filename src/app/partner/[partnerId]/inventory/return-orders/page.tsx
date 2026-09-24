import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { ReturnOrdersClientTable } from "./ReturnOrdersClientTable";
import { ReturnOrdersNewButton } from "./ReturnOrdersNewButton";
import { BulkUploadButton } from "@/components/BulkUploadButton";
import { bulkImportReturnOrdersAction } from "./actions";
import { applyCustomizations } from "@/lib/designer/customizations";
import { returnOrderColumns, getReturnOrderFormFields } from "@/lib/sample-data/warehouse";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { getAvailabilityByMaterial } from "@/lib/inventoryStock";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "inventory.return-orders.list",
  moduleSlug: "inventory",
  title: "Return Orders — List",
  path: "/partner/[partnerId]/inventory/return-orders",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
    { key: "filters", label: "List filters" },
  ],
  explanation:
    "Lists every return order, both directions: Inbound (defective/good material a Service Centre location sends back to its mapped Warehouse — adds to Stock once Received) and Outbound (a Warehouse shipping Defective stock out to a Vendor/OEM, gated on a Vendor Name and Challan Number — deducts from Stock once Dispatched). Outbound is the ONLY path in the app that can reduce Defective stock; no Stock Adjustment, Stock Transfer, or Stock edit-page path is allowed to touch it. \"+ New\" creates one; row-click navigates into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/inventory/return-orders/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function ReturnOrdersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("inventory.return-orders.list", returnOrderColumns);
  const rows = await listBusinessRecords(params.partnerId, "inventory-return-orders");
  const formFields = await getReturnOrderFormFields(params.partnerId);
  const materialOptions = await getBomOptionsForPartner(params.partnerId);
  const availability = await getAvailabilityByMaterial(params.partnerId);
  const availabilityLabels = Object.fromEntries(availability);

  return (
    <AppShell
      topbarTitle="Return Orders"
      topbarActions={
        <div className="flex items-center gap-3">
          <BulkUploadButton
            title="Bulk Upload Return Orders"
            columns={formFields.map((f) => f.key)}
            requiredColumnsNote="Direction, Return Type, Material, Quantity, Source Location and Status are always required. Inbound also requires Destination Warehouse; Outbound also requires Vendor/OEM Name and a Challan Number (no stock is deducted without one)."
            sampleRow={["Inbound", "WO202608080002", "Defective", "Li-ion Battery 4000mAh — Generic", "1", "Indiranagar Service Centre", "Central Warehouse — Bengaluru", "", "", "Pending", "2026-09-19"]}
            templateFilename="return-orders-template.csv"
            importAction={bulkImportReturnOrdersAction.bind(null, params.partnerId)}
          />
          <ReturnOrdersNewButton
            partnerId={params.partnerId}
            fields={formFields}
            materialOptions={materialOptions}
            availabilityLabels={availabilityLabels}
          />
        </div>
      }
    >
      <div>
        <div className="mt-2">
          <ReturnOrdersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
