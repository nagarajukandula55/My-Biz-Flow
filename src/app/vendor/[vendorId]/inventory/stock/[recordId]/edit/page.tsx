import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { stockFormFields } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "inventory.stock.edit",
  moduleSlug: "inventory",
  title: "Inventory (Stock) — Edit",
  path: "/vendor/[vendorId]/inventory/stock/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing per-warehouse stock ledger entry's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/inventory/stock/[recordId]/edit/page.tsx",
});

export default async function EditStockPage({ params }: { params: { vendorId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.vendorId, "inventory-stock", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("inventory.stock.edit", stockFormFields);

  return (
    <AppShell topbarTitle="Edit Stock Entry — Inventory (Stock)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Stock Entry</h1>
        <p className="mt-1 text-xs text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "inventory-stock", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
