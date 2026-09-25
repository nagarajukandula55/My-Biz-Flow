import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { PriceTiersClientTable } from "./PriceTiersClientTable";
import { applyCustomizations } from "@/lib/designer/customizations";
import { priceTierColumns, priceTierToRow } from "@/lib/sample-data/priceTiers";
import { listPriceTiers } from "@/lib/wholesaleData";

registerPage({
  id: "wholesale-b2b.price-tiers.list",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Price Tiers",
  path: "/partner/[partnerId]/wholesale-b2b/price-tiers",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [
    { key: "columns", label: "Table columns" },
  ],
  explanation: "Lists every PriceTier (name + discount %) this partner has defined for Wholesale B2B orders — Prisma-backed, with a \"+ New\" action and row-click navigation into the record's detail view.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/price-tiers/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PriceTiersPage({ params }: { params: { partnerId: string } }) {
  const columns = await applyCustomizations("wholesale-b2b.price-tiers.list", priceTierColumns);
  const tiers = await listPriceTiers(params.partnerId);
  const rows = tiers.map(priceTierToRow);

  return (
    <AppShell
      topbarTitle="Wholesale B2B — Price Tiers"
      topbarActions={
        <Link href={`/partner/${params.partnerId}/wholesale-b2b/price-tiers/new`} className="btn-accent">
          + New Price Tier
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">Bulk-discount tiers applicable to Wholesale B2B orders.</p>
        <div className="mt-6">
          <PriceTiersClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
