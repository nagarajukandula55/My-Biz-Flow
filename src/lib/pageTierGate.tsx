import type { ReactNode } from "react";
import { UpgradeGate } from "@/components/UpgradeGate";
import { getPageTierAccess } from "@/lib/tenant";

/**
 * The two-line call every tier-gated page makes at the very top of its
 * Server Component body:
 *
 *   const gate = await renderTierGate(params.partnerId, "<pageId>", "<label>");
 *   if (gate) return <AppShell topbarTitle="...">{gate}</AppShell>;
 *
 * Returning early like this matters for more than tidiness: the page's
 * data queries never run for a partner whose plan doesn't cover the
 * feature, so the gate is a real access boundary and not just a visual
 * overlay on top of data that was already fetched.
 *
 * `pageId` must be the same id the page's own registerPage() call
 * declares — that id is the key into planTierByPage / DEFAULT_PAGE_TIERS,
 * so the gate and the pricing page are looking at the same entry.
 */
export async function renderTierGate(
  partnerId: string,
  pageId: string,
  featureName: string
): Promise<ReactNode | null> {
  const access = await getPageTierAccess(partnerId, pageId);
  if (access.allowed) return null;
  return (
    <UpgradeGate
      featureName={featureName}
      requiredTier={access.requiredTier}
      heldTier={access.heldTier}
      partnerTypeId={access.partnerTypeId}
      upgradePlanName={access.upgradePlanName}
    />
  );
}
