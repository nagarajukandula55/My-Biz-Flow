import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerPage } from "@/lib/designer/registry";
import { getBomOptionsForPartner } from "@/lib/sample-data/bom";
import { getBom } from "@/lib/manufacturing";
import { updateBomAction } from "../../actions";
import { BomForm } from "../BomForm";
import type { MaterialLineItem } from "@/components/MaterialLineItemsTable";

registerPage({
  id: "manufacturing.bom.detail",
  moduleSlug: "manufacturing",
  title: "Manufacturing — Bill of Materials Detail",
  path: "/partner/[partnerId]/manufacturing/bom/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Edits an existing BillOfMaterial and its BomLines — saving replaces the line set wholesale (delete + recreate) and bumps the BOM's version.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/bom/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BomDetailPage({ params }: { params: { partnerId: string; recordId: string } }) {
  const bom = await getBom(params.partnerId, params.recordId);
  if (!bom) notFound();
  const materialOptions = await getBomOptionsForPartner(params.partnerId);

  const initialLines: MaterialLineItem[] = bom.lines.map((l) => ({
    materialId: l.materialLabel,
    quantity: l.quantity,
    unitPrice: l.unitCost / 100,
  }));

  return (
    <AppShell topbarTitle="Edit Bill of Materials">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text">{bom.productName}</h1>
            <p className="mt-1 text-sm text-text-muted">{bom.id} · v{bom.version}</p>
          </div>
          <Link href={`/partner/${params.partnerId}/manufacturing/bom`} className="btn-outline">
            &larr; Back
          </Link>
        </div>
        <div className="mt-6">
          <BomForm
            materialOptions={materialOptions}
            initialValues={{ productName: bom.productName, productCode: bom.productCode ?? "", isActive: bom.isActive }}
            initialLines={initialLines}
            submitLabel="Save changes"
            action={updateBomAction.bind(null, params.partnerId, params.recordId)}
          />
        </div>
      </div>
    </AppShell>
  );
}
