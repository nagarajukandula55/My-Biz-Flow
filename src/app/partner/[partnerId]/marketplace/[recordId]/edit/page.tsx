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
  title: "Marketplace / Partner Aggregator — Edit",
  path: "/partner/[partnerId]/marketplace/[recordId]/edit",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "The same config-driven RecordForm pre-populated with an existing partner listing's sample data, letting a user edit and save changes (demo stub, no persistence yet).",
  sourceFile: "src/app/partner/[partnerId]/marketplace/[recordId]/edit/page.tsx",
});

export default async function EditMarketplacePage({ params }: { params: { partnerId: string; recordId: string } }) {
  const mod = await getModule("marketplace");
  const record = await getBusinessRecord(params.partnerId, "marketplace", params.recordId);
  if (!record) notFound();
  const fields = await applyCustomizations("marketplace.edit", marketplaceFormFields);

  return (
    <AppShell topbarTitle={`Edit Partner Listing — ${mod?.label ?? "Marketplace / Partner Aggregator"}`}>
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Edit Partner Listing</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm
            fields={fields}
            initialValues={record}
            submitLabel="Save changes"
            action={updateBusinessRecordAction.bind(null, params.partnerId, "marketplace", params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
