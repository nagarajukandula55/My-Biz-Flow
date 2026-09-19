import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { getStockFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "inventory.stock.edit",
  moduleSlug: "inventory",
  title: "Inventory (Stock) — Edit",
  path: "/partner/[partnerId]/inventory/stock/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation:
    "Config-driven RecordForm for a stock ledger entry — deliberately excludes Qty on Hand from the editable fields. A quantity change must go through Stock Adjustments (with a reason), Part Orders (dispatch), or Stock Take (physical recount) instead of a bare number overwrite with no record of why (see createStockAdjustmentAction/createPartOrderAction/createStockTakeAction, src/lib/inventoryStock.ts).",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock/[recordId]/edit/page.tsx",
});

export default async function EditStockPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock", params.recordId);
  if (!record) notFound();
  // Qty on Hand is excluded — see the explanation above. Every other field
  // (Material, Warehouse, Reserved Qty, Reorder Level) stays editable.
  const allFields = await getStockFormFields(params.partnerId);
  const editableFields = allFields.filter((f) => f.key !== "qtyOnHand");
  const fields = await applyCustomizations("inventory.stock.edit", editableFields);

  return (
    <AppShell topbarTitle="Edit Stock Entry — Inventory (Stock)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Stock Entry</h1>
        <p className="mt-1 text-xs text-text-muted">
          {String(record["id"])} — Qty on Hand: {String(record["qtyOnHand"] ?? 0)} (change it via Stock Adjustments,
          Part Orders, or Stock Take, not here)
        </p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={(values: Record<string, unknown>) => updateBusinessRecordAction(params.partnerId, "inventory-stock", params.recordId, values, "inventory/stock")}
          />
        </div>
      </div>
    </AppShell>
  );
}
