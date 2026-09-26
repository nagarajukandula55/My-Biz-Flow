import { AppShell } from "@/components/AppShell";
import { getModule } from "@/lib/designer/moduleRegistry";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import type { Column, Row } from "@/components/DataTable";
import { requirePartnerSessionForPage } from "@/lib/requirePartnerSession";
import { listAssets } from "@/lib/rentals";
import { AssetsClientTable } from "./AssetsClientTable";

registerPage({
  id: "rentals.assets.list",
  moduleSlug: "rentals",
  title: "Rentals / Booking — Assets",
  path: "/partner/[partnerId]/rentals/assets",
  kind: "list",
  superAdminOnly: false,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation: "Lists every RentalAsset (Prisma-backed) — the rentable catalog of equipment/venues — with a \"+ New Asset\" action and row-click navigation into that asset's own detail page (which shows its booking history).",
  sourceFile: "src/app/partner/[partnerId]/rentals/assets/page.tsx",
});

export const dynamic = "force-dynamic";

const columns: Column[] = [
  { key: "assetName", label: "Asset / Venue Name", type: "text" },
  { key: "isActive", label: "Active", type: "boolean" },
];

export default async function RentalAssetsPage({ params }: { params: { partnerId: string } }) {
  await requirePartnerSessionForPage(params.partnerId);
  const mod = await getModule("rentals");
  const assets = await listAssets(params.partnerId);
  const rows: Row[] = assets.map((a) => ({
    id: a.id,
    assetName: a.assetName,
    isActive: a.isActive,
  }));

  return (
    <AppShell
      topbarTitle={`Assets — ${mod?.label ?? "Rentals / Booking"}`}
      topbarActions={
        <Link href={`/partner/${params.partnerId}/rentals/assets/new`} className="btn-accent">
          + New Asset
        </Link>
      }
    >
      <div>
        <p className="text-sm text-text-muted">The catalog of equipment/venues available to book.</p>
        <div className="mt-6">
          <AssetsClientTable partnerId={params.partnerId} columns={columns} rows={rows} />
        </div>
      </div>
    </AppShell>
  );
}
