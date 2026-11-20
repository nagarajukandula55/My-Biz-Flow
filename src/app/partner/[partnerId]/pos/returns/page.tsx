import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { requirePosStaff } from "@/lib/pos/posAuth";
import { renderTierGate } from "@/lib/pageTierGate";
import { BarcodeReturnLookup } from "./BarcodeReturnLookup";

registerPage({ id: "pos.return-barcode", moduleSlug: "pos", title: "POS Return by Barcode", path: "/partner/[partnerId]/pos/returns", kind: "form", superAdminOnly: false, customizableRegions: [], explanation: "POS Pro barcode lookup for a completed sale before opening the existing audited refund flow.", sourceFile: "src/app/partner/[partnerId]/pos/returns/page.tsx" });
export const dynamic = "force-dynamic";
export default async function BarcodeReturnsPage({ params }: { params: { partnerId: string } }) { await requirePosStaff(params.partnerId); const gate = await renderTierGate(params.partnerId, "inventory.barcodes", "Barcode Returns"); return <AppShell topbarTitle="Return by Barcode"><div className="mbf-page">{gate ?? <BarcodeReturnLookup partnerId={params.partnerId} />}</div></AppShell>; }
