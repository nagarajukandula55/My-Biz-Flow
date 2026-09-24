import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { getStockAdjustmentFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateStockAdjustmentAction } from "../../actions";

registerPage({
  id: "inventory.stock-adjustments.edit",
  moduleSlug: "inventory",
  title: "Stock Adjustments — Edit",
  path: "/partner/[partnerId]/inventory/stock-adjustments/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation:
    "Config-driven RecordForm for correcting a Stock Adjustment. Unlike Return Orders, a Stock Adjustment's real Stock effect is applied immediately at creation (no Pending stage), so saving an edit here first REVERSES the original delta against the record's own stored material/warehouse/type/quantity, then validates and applies the new one — see updateStockAdjustmentAction's doc comment. A Decrease larger than what's on hand after the reversal is rejected and the reversal is put back, so a rejected edit never leaves stock mid-way changed.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock-adjustments/[recordId]/edit/page.tsx",
});

export default async function EditStockAdjustmentPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock-adjustments", params.recordId);
  if (!record) notFound();

  const allFields = await getStockAdjustmentFormFields(params.partnerId);
  const fields = await applyCustomizations("inventory.stock-adjustments.edit", allFields);

  return (
    <AppShell topbarTitle="Edit Adjustment — Stock Adjustments">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Stock Adjustment</h1>
        <p className="mt-1 text-xs text-text-muted">
          {String(record["id"])} — saving corrects the real Stock quantity too: the original effect is reversed
          first, then the edited values are re-applied.
        </p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={(values: Record<string, unknown>) => updateStockAdjustmentAction(params.partnerId, params.recordId, values)}
          />
        </div>
      </div>
    </AppShell>
  );
}
