import { AppShell } from "@/components/AppShell";
import { buildVendorNavGroups, getModule } from "@/lib/designer/modules";
import { registerPage } from "@/lib/designer/registry";
import { RecordForm } from "@/components/RecordForm";
import { marketplaceFormFields, getMarketplaceRecord } from "@/lib/sample-data/marketplace";

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

export default function EditMarketplacePage({ params }: { params: { recordId: string } }) {
  const mod = getModule("marketplace");
  const record = getMarketplaceRecord(params.recordId);

  return (
    <AppShell navGroups={buildVendorNavGroups("marketplace")} topbarTitle={`Edit Vendor Listing — ${mod?.label ?? "Marketplace / Vendor Aggregator"}`}>
      <div className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Edit Vendor Listing</h1>
        <p className="mt-1 text-sm text-text-muted">{String(record["id"])}</p>
        <div className="mt-6">
          <RecordForm fields={marketplaceFormFields} initialValues={record} submitLabel="Save changes" />
        </div>
      </div>
    </AppShell>
  );
}
