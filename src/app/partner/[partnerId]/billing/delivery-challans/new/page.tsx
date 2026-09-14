import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { SalesDocumentForm } from "@/components/SalesDocumentForm";
import { createBusinessRecordAction } from "@/lib/businessRecordActions";
import { listBusinessRecords } from "@/lib/businessRecords";

registerPage({
  id: "billing.delivery-challans.create",
  moduleSlug: "billing",
  title: "Billing — Delivery Challans — Create",
  path: "/partner/[partnerId]/billing/delivery-challans/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [
    { key: "form-fields", label: "Form fields" },
    { key: "validation-rules", label: "Validation rules" },
    { key: "default-values", label: "Default values" },
  ],
  explanation: "A Delivery Challan creation form with a repeating, live-computed line-items table (see LineItemsEditor), mirroring Billing's invoice form. Real persistence — writes to the BusinessRecord table.",
  sourceFile: "src/app/partner/[partnerId]/billing/delivery-challans/new/page.tsx",
});

export default async function NewDeliveryChallanPage({ params }: { params: { partnerId: string } }) {
  const tierGate = await renderTierGate(params.partnerId, "billing.delivery-challans.create", "Delivery Challans");
  if (tierGate) return <AppShell topbarTitle={"New Delivery Challan"}>{tierGate}</AppShell>;

  const [contacts, catalogItems] = await Promise.all([
    listBusinessRecords(params.partnerId, "billing-contacts"),
    listBusinessRecords(params.partnerId, "billing-items"),
  ]);
  const contactOptions = contacts.map((c) => ({ id: String(c["id"]), label: String(c["name"] ?? c["id"]), gstin: c["gstin"] ? String(c["gstin"]) : undefined }));
  const itemOptions = catalogItems.map((it) => ({
    id: String(it["id"]),
    label: String(it["name"] ?? it["id"]),
    unit: String(it["unit"] ?? "pcs"),
    unitPrice: Number(it["rate"] ?? 0),
    taxRate: Number(it["taxRate"] ?? 0),
  }));

  return (
    <AppShell topbarTitle="New Delivery Challan — Billing">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Delivery Challan</h1>
        <p className="mt-1 text-sm text-text-muted">Issue a delivery challan to a Billing contact.</p>
        <div className="mt-6">
          <SalesDocumentForm
            docKind="delivery-challan"
            docLabel="Delivery Challan"
            submitLabel="Create Delivery Challan"
            action={createBusinessRecordAction.bind(null, params.partnerId, "billing-delivery-challans")}
            contactOptions={contactOptions}
            itemOptions={itemOptions}
          />
        </div>
      </div>
    </AppShell>
  );
}
