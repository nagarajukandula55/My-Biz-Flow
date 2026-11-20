import { AppShell } from "@/components/AppShell";
import { assertPosBarcodeAccess } from "@/lib/barcodeCatalog";
import { listBusinessRecords } from "@/lib/businessRecords";
import { renderTierGate } from "@/lib/pageTierGate";
import { registerPage } from "@/lib/designer/registry";

registerPage({ id: "inventory.barcodes.audit", moduleSlug: "inventory", title: "Barcode Audit", path: "/partner/[partnerId]/inventory/barcodes/audit", kind: "list", superAdminOnly: false, customizableRegions: [], explanation: "POS Pro audit trail of barcode generation, unique-unit ranges and requested label print jobs.", sourceFile: "src/app/partner/[partnerId]/inventory/barcodes/audit/page.tsx" });
export const dynamic = "force-dynamic";
export default async function BarcodeAuditPage({ params }: { params: { partnerId: string } }) {
  await assertPosBarcodeAccess(params.partnerId);
  const gate = await renderTierGate(params.partnerId, "inventory.barcodes", "Barcode & Labels");
  if (gate) return <AppShell topbarTitle="Barcode Audit">{gate}</AppShell>;
  const rows = (await listBusinessRecords(params.partnerId, "inventory-barcode-audit")).sort((a, b) => String(b["at"] ?? "").localeCompare(String(a["at"] ?? ""))).slice(0, 250);
  return <AppShell topbarTitle="Barcode Audit"><div className="mbf-page"><h1 className="font-display text-2xl font-bold">Barcode audit</h1><p className="mt-1 text-sm text-text-muted">Generation and requested-print history for this POS business.</p><div className="mt-6 overflow-x-auto rounded-lg border border-border bg-bg-raised"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted"><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Product / Barcode</th><th className="p-3">Details</th></tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)} className="border-b border-border last:border-0"><td className="p-3 whitespace-nowrap">{String(row["at"] ?? "-")}</td><td className="p-3">{String(row["action"] ?? "-")}</td><td className="p-3 font-mono text-xs">{String(row["barcode"] ?? row["materialId"] ?? "-")}</td><td className="p-3 text-text-muted">{row["labelCount"] ? `${row["labelCount"]} label(s), ${String(row["source"] ?? "")}` : row["quantity"] ? `${row["quantity"]} unique unit label(s)` : ""}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-6 text-sm text-text-muted">No barcode activity yet.</p>}</div></div></AppShell>;
}
