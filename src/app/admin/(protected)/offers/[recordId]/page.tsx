import Link from "next/link";
import { notFound } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { StatusChip } from "@/components/StatusChip";
import { registerPage } from "@/lib/designer/registry";
import { getOffer } from "@/lib/subscriptionData";
import { listPlans } from "@/lib/plansData";
import { cycleLabel, type BillingCycle } from "@/lib/subscriptionData";
import { DeleteOfferButton } from "./DeleteOfferButton";

export const dynamic = "force-dynamic";

registerPage({
  id: "platform.offers.detail",
  moduleSlug: "platform",
  title: "Offers — Detail",
  path: "/admin/offers/[recordId]",
  kind: "detail",
  superAdminOnly: true,
  customizableRegions: [{ key: "field-grid", label: "Detail field grid" }],
  explanation: "Read-only detail view of a single Offer, with Edit and Delete actions.",
  sourceFile: "src/app/admin/(protected)/offers/[recordId]/page.tsx",
});

export default async function OfferDetailPage({ params }: { params: { recordId: string } }) {
  const offer = await getOffer(params.recordId);
  if (!offer) notFound();
  const plans = await listPlans();
  const planNameById = new Map(plans.map((p) => [p.id, p.name]));

  return (
    <SuperAdminGate>
      <div className="mbf-page">
        <div className="border-b border-border bg-bg-raised px-6 py-4">
          <h1 className="font-display text-lg font-bold text-text">Offers</h1>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-text">{offer.name}</h1>
                <StatusChip label={offer.isActive ? "Active" : "Inactive"} variant={offer.isActive ? "success" : "neutral"} />
                {offer.isCombo && <StatusChip label="Combo" variant="warning" />}
              </div>
              <p className="mt-1 text-xs text-text-muted">{offer.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/offers" className="btn-outline">
                &larr; Back
              </Link>
              <Link href={`/admin/offers/${offer.id}/edit`} className="btn-outline">
                Edit
              </Link>
              <DeleteOfferButton id={offer.id} name={offer.name} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-raised p-5">
              <h2 className="font-display text-sm font-bold text-text">Discount</h2>
              <p className="mt-2 text-sm text-text">
                {offer.discountType === "percent" ? `${offer.discountValue}% off` : `₹${offer.discountValue.toLocaleString("en-IN")} off`}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Valid {offer.validFrom ? offer.validFrom.toISOString().slice(0, 10) : "any time"} to{" "}
                {offer.validTo ? offer.validTo.toISOString().slice(0, 10) : "no end date"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-bg-raised p-5">
              <h2 className="font-display text-sm font-bold text-text">Applies To</h2>
              <p className="mt-2 text-xs text-text-muted">
                Plans:{" "}
                {offer.planIds.length === 0 ? "All plans" : offer.planIds.map((id) => planNameById.get(id) ?? id).join(", ")}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Cycles:{" "}
                {offer.billingCycles.length === 0
                  ? "All cycles"
                  : offer.billingCycles.map((c) => cycleLabel(c as BillingCycle)).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminGate>
  );
}
