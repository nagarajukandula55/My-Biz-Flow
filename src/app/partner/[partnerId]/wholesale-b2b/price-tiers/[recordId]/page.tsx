import { AppShell } from "@/components/AppShell";
import { registerPage } from "@/lib/designer/registry";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecordDetail } from "@/components/RecordDetail";
import { getPriceTierDetailFields, priceTierToRow } from "@/lib/sample-data/priceTiers";
import { getPriceTier } from "@/lib/wholesaleData";

registerPage({
  id: "wholesale-b2b.price-tiers.detail",
  moduleSlug: "wholesale-b2b",
  title: "Wholesale B2B — Price Tiers — Detail",
  path: "/partner/[partnerId]/wholesale-b2b/price-tiers/[recordId]",
  kind: "detail",
  superAdminOnly: false,
  customizableRegions: [
    { key: "field-grid", label: "Detail field grid" },
  ],
  explanation: "Read-only detail view of a single PriceTier, rendered via the shared RecordDetail component, with an Edit action.",
  sourceFile: "src/app/partner/[partnerId]/wholesale-b2b/price-tiers/[recordId]/page.tsx",
});

export const dynamic = "force-dynamic";

export default async function PriceTierDetailPage({
  params,
  searchParams,
}: {
  params: { partnerId: string; recordId: string };
  searchParams?: { created?: string; updated?: string };
}) {
  const tier = await getPriceTier(params.partnerId, params.recordId);
  if (!tier) notFound();
  const row = priceTierToRow(tier);
  const fields = getPriceTierDetailFields(row);

  return (
    <AppShell topbarTitle="Wholesale B2B — Price Tiers">
      <div>
        <RecordDetail
          fields={fields}
          recordLabel={tier.name}
          searchParams={searchParams}
          headerSlot={
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-xl font-bold text-text">{tier.name}</h1>
                <p className="mt-1 text-xs text-text-muted">Price tier detail</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/partner/${params.partnerId}/wholesale-b2b/price-tiers`} className="btn-outline">
                  &larr; Back
                </Link>
                <Link href={`/partner/${params.partnerId}/wholesale-b2b/price-tiers/${params.recordId}/edit`} className="btn-outline">
                  Edit
                </Link>
              </div>
            </div>
          }
        />
      </div>
    </AppShell>
  );
}
