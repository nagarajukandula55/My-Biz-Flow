import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { notFound } from "next/navigation";
import { marketplaceFormFields } from "@/lib/sample-data/marketplace";
import { applyCustomizations } from "@/lib/designer/customizations";
import { getBusinessRecord } from "@/lib/businessRecords";
import { updateBusinessRecordAction } from "@/lib/businessRecordActions";

registerPage({
  id: "marketplace.edit",
  moduleSlug: "marketplace",
  title: "Marketplace / Vendor Aggregator — Edit",
  path: "/vendor/[vendorId]/marketplace/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing vendor listing's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/vendor/[vendorId]/marketplace/[recordId]/edit/page.tsx",
});

export default async function EditMarketplacePage({ params }: { params: { vendorId: string; recordId: string } }) {
  const mod = await getModule("marketplace");
  const record = await getBusinessRecord(params.vendorId, "marketplace", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("marketplace.edit", marketplaceFormFields);

  return (
    <AppShell topbarTitle={`Edit Vendor Listing — ${mod?.label ?? "Marketplace / Vendor Aggregator"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Vendor Listing</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.vendorId, "marketplace", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
