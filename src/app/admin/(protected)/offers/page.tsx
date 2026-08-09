import Link from "next/link";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { registerPage } from "@/lib/designer/registry";
import { listOffers } from "@/lib/subscriptionData";
import { OfferClientTable } from "./OfferClientTable";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.offers.list",
  moduleSlug: "platform",
  title: "Offers — List",
  path: "/admin/offers",
  kind: "admin",
  superAdminOnly: true,
  customizableRegions: [{ key: "columns", label: "Table columns" }],
  explanation:
    "Super-Admin-only CRUD over combo/discount Offers that can be applied to a Plan's computed billing-cycle price. Real data — Prisma-backed (Offer table).",
  sourceFile: "src/app/admin/(protected)/offers/page.tsx",
});

export default async function OffersPage() {
  const offers = await listOffers();
  const rows = offers.map((o) => ({
    ...o,
    isCombo: o.isCombo ? "Yes" : "No",
    isActive: o.isActive ? "Yes" : "No",
  }));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="flex items-center justify-between border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Offers</h1>
          <Link href="/admin/offers/new" className="btn-accent">
            + New Offer
          </Link>
        </div>
        <div className="p-6">
          <p className="text-sm text-text-muted">
            Discounts or combo bundles applied on top of a Plan&apos;s computed billing-cycle price when a vendor
            converts off trial.
          </p>
          <div className="mt-6">
            {rows.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-bg-raised p-6 text-center text-sm text-text-muted">
                No Offers yet.
              </p>
            ) : (
              <OfferClientTable rows={rows} />
            )}
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
