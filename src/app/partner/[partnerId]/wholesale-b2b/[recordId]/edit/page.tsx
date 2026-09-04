import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { wholesaleB2bFormFields } from "@/lib/sample-data/wholesale-b2b";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateWholesaleOrderAction } from "../../actions";

registerPage({
  id: "wholesale-b2b.edit",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale / Distributor B2B — Edit",
  path: "/partner/[partnerId]/wholesale-b2b/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing order's real data. Saving recomputes tiered/bulk pricing server-side and re-checks the dealer's credit limit (excluding this order's own prior total).",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/[recordId]/edit/page.tsx",
});

export default async function EditWholesaleB2bPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("wholesale-b2b");
  const record = await getBusinessRecord(params.partnerId, "wholesale-b2b", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("wholesale-b2b.edit", wholesaleB2bFormFields);

  return (
    <AppShell topbarTitle={`Edit Order — ${mod?.label ?? "Wholesale / Distributor B2B"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Order</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateWholesaleOrderAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
