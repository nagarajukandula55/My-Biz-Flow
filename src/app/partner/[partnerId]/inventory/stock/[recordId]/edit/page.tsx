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
    "Config-driven RecordForm for a stock ledger entry — deliberately excludes Qty on Hand AND Material Type (Good/Defective) from the editable fields. A quantity change must go through Stock Adjustments (with a reason), Part Orders (dispatch), or Stock Take (physical recount) instead of a bare number overwrite with no record of why (see createStockAdjustmentAction/createPartOrderAction/createStockTakeAction, src/lib/inventoryStock.ts). Material Type is never partner-editable at all — a row only becomes Defective by a workorder consuming a Good part (deductInventoryForWorkorderAction) or an Inbound Return Order marked returnType \"Defective\", and only ever leaves the Defective bucket via an Outbound Return Order with a Challan Number (createReturnOrderAction) — no manual path exists to flip a row's condition or otherwise adjust Defective stock, by design.",
  sourceFile: "src/app/partner/[partnerId]/inventory/stock/[recordId]/edit/page.tsx",
});

export default async function EditStockPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "inventory-stock", params.recordId);
  if (!record) notFound();
  const condition = record["condition"] === "Defective" ? "Defective" : "Good";

  // Qty on Hand and Material Type are excluded from the editable field set
  // — see the explanation above. Every other field (Material, Warehouse,
  // Reserved Qty, Reorder Level) stays editable. Excluded fields are NOT
  // sent back in the submitted `values` (RecordForm only tracks the fields
  // it renders), and updateBusinessRecord replaces the record's whole JSON
  // blob rather than merging — so the submit handler below re-merges the
  // full existing record underneath whatever the form submits, or every
  // save would silently wipe Qty on Hand, Material Type, and Available Qty
  // back to blank.
  const allFields = await getStockFormFields(params.partnerId);
  const editableFields = allFields.filter((f) => f.key !== "qtyOnHand" && f.key !== "condition");
  const fields = await applyCustomizations("inventory.stock.edit", editableFields);

  async function save(values: Record<string, unknown>) {
    "use server";
    return updateBusinessRecordAction(params.partnerId, "inventory-stock", params.recordId, { ...record, ...values }, "inventory/stock");
  }

  return (
    <AppShell topbarTitle="Edit Stock Entry — Inventory (Stock)">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Stock Entry</h1>
        <p className="mt-1 text-xs text-text-muted">
          {String(record["id"])} — Qty on Hand: {String(record["qtyOnHand"] ?? 0)} (change it via Stock Adjustments,
          Part Orders, or Stock Take, not here) — Material Type: {condition} (never manually editable — Defective
          stock only ever leaves via an Outbound Return Order with a Challan Number)
        </p>
        <div className="mt-6">
          <RecordForm fields={fields} initialValues={record} submitLabel="Save changes" action={save} />
        </div>
      </div>
    </AppShell>
  );
}
