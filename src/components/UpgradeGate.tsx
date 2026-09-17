import Link from "next/link";
import { Lock } from "lucide-react";
import { TIER_LABEL, type PlanTier } from "@/lib/designer/pageTiers";

/**
 * What a partner sees instead of a page their plan tier doesn't cover.
 *
 * Rendered by pages that call getPageTierAccess() (src/lib/tenant.ts) and
 * get back `allowed: false`. Deliberately a normal in-shell panel — same
 * bordered bg-bg-raised card vocabulary every other partner surface uses —
 * rather than an error screen or a redirect: the partner is a paying
 * customer looking at a real feature of the product, so this is an offer,
 * not a failure.
 */
export function UpgradeGate({
  featureName,
  requiredTier,
  heldTier,
  partnerTypeId,
  upgradePlanName,
}: {
  featureName: string;
  requiredTier: PlanTier;
  heldTier: PlanTier;
  partnerTypeId: string;
  upgradePlanName: string | null;
}) {
  const pricingHref = partnerTypeId
    ? `/pricing?type=${encodeURIComponent(partnerTypeId)}`
    : "/pricing";

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-md border border-border bg-bg-raised p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-sunken">
        <Lock className="h-5 w-5 text-text-muted" aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-lg font-bold text-text">
        {featureName} is a {TIER_LABEL[requiredTier]} feature
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Your current plan includes the {TIER_LABEL[heldTier]} tier.{" "}
        {upgradePlanName
          ? `Upgrade to ${upgradePlanName} to unlock ${featureName}.`
          : `Upgrade to unlock ${featureName}.`}
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Link href={pricingHref} className="btn-accent">
          Upgrade to unlock
        </Link>
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Nothing you&apos;ve already entered is affected — this feature simply isn&apos;t part of your
        current plan.
      </p>
    </div>
  );
}
