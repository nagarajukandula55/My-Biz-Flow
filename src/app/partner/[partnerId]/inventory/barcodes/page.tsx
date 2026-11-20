import { AppShell } from "@/components/AppShell";
import { renderTierGate } from "@/lib/pageTierGate";
import { assertPosBarcodeAccess, getBarcodeSettings } from "@/lib/barcodeCatalog";
import { BarcodeSettingsForm } from "./BarcodeSettingsForm";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getVisibleModuleSlugs } from "@/lib/designer/entitlements";

registerPage({
  id: "inventory.barcodes",
  moduleSlug: "inventory",
  title: "Barcode & Labels",
  path: "/partner/[partnerId]/inventory/barcodes",
  kind: "form",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Partner-owned barcode series and printable product-label setup for Inventory and POS. Settings cover prefix, sequence, barcode type, price display and physical label dimensions.",
  sourceFile: "src/app/partner/[partnerId]/inventory/barcodes/page.tsx",
});

export const dynamic = "force-dynamic";
export default async function BarcodeSettingsPage({ params }: { params: { partnerId: string } }) {
  if (!(await getVisibleModuleSlugs(params.partnerId)).includes("pos")) {
    redirect(`/partner/${params.partnerId}/inventory`);
  }
  await assertPosBarcodeAccess(params.partnerId);
  const gate = await renderTierGate(params.partnerId, "inventory.barcodes", "Barcode & Labels");
  if (gate) return <AppShell topbarTitle="Barcode & Labels">{gate}</AppShell>;
  const settings = await getBarcodeSettings(params.partnerId);
  return <AppShell topbarTitle="Barcode & Labels"><div className="mbf-page"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Barcode & Labels</h1><p className="mt-1 max-w-3xl text-sm text-text-muted">Create a barcode series owned by your business, choose the barcode type and price display, and set labels for your printer. Use Material Catalog to assign codes and print product labels.</p></div><div className="flex gap-2"><Link href={`/partner/${params.partnerId}/inventory/barcodes/audit`} className="btn-outline">Audit history</Link><Link href={`/partner/${params.partnerId}/inventory/barcodes/print`} className="btn-accent">Batch print labels</Link></div></div><div className="mt-6"><BarcodeSettingsForm partnerId={params.partnerId} settings={settings} /></div></div></AppShell>;
}
