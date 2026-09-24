import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { getReturnOrderFormFields, RETURN_ORDER_FINAL_STATUSES } from "@/lib/sample-data/warehouse";
import { applyCustomizations } from "@/lib/designer/customizations";
import { notFound, redirect } from "next/navigation";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateReturnOrderAction } from "../../actions";

registerPage({
  id: "inventory.return-orders.edit",
  moduleSlug: "inventory",
  title: "Return Orders — Edit",
  path: "/partner/[partnerId]/inventory/return-orders/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
  ],
  explanation:
    "Config-driven RecordForm for correcting a Return Order — but ONLY reachable while it's still Pending/In Transit, i.e. before its real Stock effect has ever been applied. Once a Return Order reaches Received, Dispatched, Rejected, or Cancelled, this route 404s (see RETURN_ORDER_FINAL_STATUSES) and there is no edit path left — a finalized Return Order is permanent, since editing after the fact would mean silently re-running or duplicating a stock movement (especially an Outbound Defective-stock deduction, which must never be reversible by a bare form edit).",
  sourceFile: "src/app/partner/[partnerId]/inventory/return-orders/[recordId]/edit/page.tsx",
});

export default async function EditReturnOrderPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const record = await getBusinessRecord(params.partnerId, "inventory-return-orders", params.recordId);
  if (!record) notFound();
  if ((RETURN_ORDER_FINAL_STATUSES as readonly string[]).includes(String(record["status"] ?? ""))) {
    redirect(`/partner/${params.partnerId}/inventory/return-orders/${params.recordId}`);
  }

  const allFields = await getReturnOrderFormFields(params.partnerId);
  const fields = await applyCustomizations("inventory.return-orders.edit", allFields);

  return (
    <AppShell topbarTitle="Edit Return Order — Return Orders">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Edit Return Order</h1>
        <p className="mt-1 text-xs text-text-muted">
          {String(record["id"])} — editable only while still {String(record["status"] ?? "Pending")}. Status itself is
          no longer set here — it only moves via the stage actions (Mark In Transit / Warehouse Inward / Dispatch /
          Reject) on the detail page. Once marked Received or Dispatched, this record is locked and can no longer be
          changed here.
        </p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={(values: Record<string, unknown>) => updateReturnOrderAction(params.partnerId, params.recordId, values)}
          />
        </div>
      </div>
    </AppShell>
  );
}
