import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import { requirePosStaff } from "@/lib/pos/posAuth";
import { renderTierGate } from "@/lib/pageTierGate";
import { BarcodeReturnLookup } from "./BarcodeReturnLookup";

registerPage({ id: "pos.return-barcode", moduleSlug: "pos", title: "POS Return by Barcode", path: "/partner/[partnerId]/pos/returns", kind: "form", superAdminOnly: false, customizableRegions: [], explanation: "POS Pro barcode lookup for a completed sale before opening the existing audited refund flow.", sourceFile: "src/app/partner/[partnerId]/pos/returns/page.tsx" });
export const dynamic = "force-dynamic";
export default async function BarcodeReturnsPage({ params }: { params: { partnerId: string } }) { const staff = await requirePosStaff(params.partnerId); if (staff.role !== "Manager") return <AppShell topbarTitle="Return by Barcode"><p className="mt-6 rounded-md border border-border bg-bg-raised p-5 text-sm text-text-muted">Manager access is required to process a POS return.</p></AppShell>; const gate = await renderTierGate(params.partnerId, "inventory.barcodes", "Barcode Returns"); return <AppShell topbarTitle="Return by Barcode"><div className="mbf-page">{gate ?? <BarcodeReturnLookup partnerId={params.partnerId} />}</div></AppShell>; }
