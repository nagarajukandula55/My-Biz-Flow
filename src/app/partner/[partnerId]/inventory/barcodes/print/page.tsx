import { AppShell } from "@/components/AppShell";
import { listBusinessRecords } from "@/lib/businessRecords";
import { assertPosBarcodeAccess, getBarcodeSettings } from "@/lib/barcodeCatalog";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";
import { BatchLabelPrint } from "./BatchLabelPrint";

registerPage({ id: "inventory.barcodes.print", moduleSlug: "inventory", title: "Print Barcode Labels", path: "/partner/[partnerId]/inventory/barcodes/print", kind: "form", superAdminOnly: false, customizableRegions: [], explanation: "POS-only batch product-label print queue. The owner selects product quantities; output uses the partner's Barcode & Labels series, fields and dimensions.", sourceFile: "src/app/partner/[partnerId]/inventory/barcodes/print/page.tsx" });
export const dynamic = "force-dynamic";
export default async function BatchLabelPrintPage({ params }: { params: { partnerId: string } }) {
  await assertPosBarcodeAccess(params.partnerId);
  const gate = await renderTierGate(params.partnerId, "inventory.barcodes", "Barcode & Labels");
  if (gate) return <AppShell topbarTitle="Print Barcode Labels">{gate}</AppShell>;
  const [settings, rows] = await Promise.all([getBarcodeSettings(params.partnerId), listBusinessRecords(params.partnerId, "inventory-bom")]);
  const materials = rows.filter(row => String(row.barcode ?? "").trim() && String(row.status ?? "Active") === "Active");
  return <AppShell topbarTitle="Print Barcode Labels"><div className="mbf-page"><h1 className="font-display text-2xl font-bold">Batch label printing</h1><p className="mt-1 text-sm text-text-muted">Uses the browser print dialog and your installed A4 or thermal-printer driver. Set the selected custom label dimensions in Barcode &amp; Labels before printing.</p><div className="mt-6"><BatchLabelPrint partnerId={params.partnerId} materials={materials} settings={settings} /></div></div></AppShell>;
}
