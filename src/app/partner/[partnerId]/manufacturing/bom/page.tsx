import { AppShell } from "@/components/AppShell";
import Link from "next/link";
import { registerPage } from "@/lib/designer/registry";
import { BomClientTable } from "./BomClientTable";
import { listBoms } from "@/lib/manufacturing";

registerPage({
  id: "manufacturing.bom.list",
  moduleSlug: "manufacturing",
  title: "Manufacturing — Bill of Materials",
  path: "/partner/[partnerId]/manufacturing/bom",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [],
  explanation: "Lists every BillOfMaterial (Prisma-backed — BillOfMaterial + its BomLines) this partner has defined — a named product recipe of raw-material lines that a ProductionOrder can reference, replacing the old free-text \"BOM Reference\" string on a work order.",
  sourceFile: "src/app/partner/[partnerId]/manufacturing/bom/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function BomListPage({ params }: { params: { partnerId: string } }) {
  const boms = await listBoms(params.partnerId);
  const rows = boms.map((b) => ({
    id: b.id,
    productName: b.productName,
    productCode: b.productCode ?? "—",
    version: b.version,
    lineCount: b.lines.length,
    statusLabel: b.isActive ? "Active" : "Inactive",
  }));

  return (
    <AppShell
      topbarTitle="Bill of Materials"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/manufacturing/bom/new`} className="btn-accent">
          + New BOM
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Product recipes — each BOM's material lines are consumed when a linked Production Order is completed.</p>
        <div className="mt-6">
          <BomClientTable partnerId={params.partnerId} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
