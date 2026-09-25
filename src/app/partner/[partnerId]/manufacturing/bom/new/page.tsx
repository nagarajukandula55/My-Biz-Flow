import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { createBomAction } from "../../actions";
import { BomForm } from "../BomForm";

registerPage({
  id: "manufacturing.bom.create",
  moduleSlug: "manufacturing",
  title: "Manufacturing — New Bill of Materials",
  path: "/partner/[partnerId]/manufacturing/bom/new",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Creates a new BillOfMaterial with its BomLines, using the shared MaterialLineItemsTable add-row editor against this partner's own live Material Catalog (inventory-bom).",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/bom/new/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function NewBomPage({ params }: { params: { partnerId: string } }) {
  const materialOptions = await getBomOptionsForPartner(params.partnerId);

  return (
    <AppShell topbarTitle="New Bill of Materials">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">New Bill of Materials</h1>
        <p className="mt-1 text-sm text-text-muted">Define a product's material recipe for Manufacturing / Production.</p>
        <div className="mt-6">
          <BomForm
            materialOptions={materialOptions}
            submitLabel="Create BOM"
            action={createBomAction.bind(null, params.partnerId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
