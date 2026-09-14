/**
 * Tenant-scoping convention (binding — see DESIGN_SYSTEM.md §9).
 *
 * Every route under /partner/[partnerId]/... carries a partnerId, but nothing
 * currently ENFORCES that the data shown actually belongs to that partner —
 * there's no database yet, everything renders from static sample data, so
 * the gap is invisible today. It stops being invisible the moment a real
 * data-access layer lands, and retrofitting tenant scoping across code
 * that was written without the habit is exactly the kind of thing that
 * causes cross-tenant data leaks in production.
 *
 * The rule going forward: every future function that reads or writes
 * record data MUST take a partnerId and filter/check by it — call
 * assertPartnerScope() (or the equivalent once Prisma is wired up, e.g. a
 * `where: { partnerId }` clause) before returning anything. Never write a
 * data-access function that trusts the caller to have already filtered.
 */

export class PartnerScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerScopeError";
  }
}

/**
 * Call this at the top of any (future) data-access function once real
 * records exist. Throws if the record's own partnerId doesn't match the
 * partnerId the request is scoped to — fail closed, not open.
 *
 * Today there is no `record.partnerId` to check (sample data has none), so
 * this is a guard clause with nothing to guard yet — it exists so the
 * calling convention is established now, not invented under pressure later
 * when the first real query is written.
 */
export function assertPartnerScope(requestPartnerId: string, recordPartnerId: string): void {
  if (requestPartnerId !== recordPartnerId) {
    throw new PartnerScopeError(
      `Partner scope violation: request scoped to partner "${requestPartnerId}" but record belongs to partner "${recordPartnerId}".`
    );
  }
}

export class ModuleAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleAccessError";
  }
}

/**
 * Call this next to assertPartnerScope() in any (future) data-access
 * function that belongs to a specific module. A module being in the
 * partner's PartnerType.defaultModules only means it's toggled on for
 * their plan — this checks the actual per-partner secret
 * (ModuleAccessKey, see src/lib/designer/accessKeys.ts) that gates
 * whether the module is truly reachable. Fail closed: no active key, no
 * data.
 */
export async function assertModuleAccess(partnerId: string, moduleSlug: string): Promise<void> {
  const { hasActiveAccessKey } = await import("@/lib/designer/accessKeys");
  const allowed = await hasActiveAccessKey(partnerId, moduleSlug);
  if (!allowed) {
    throw new ModuleAccessError(
      `Module access denied: partner "${partnerId}" has no active access key for module "${moduleSlug}".`
    );
  }
}

/* ------------------------------------------------------------------ *
 * Per-PAGE plan-tier access
 *
 * assertModuleAccess() above is all-or-nothing per MODULE. It cannot
 * express "this partner has Billing, but only the Pro tier of it" — which
 * is exactly what the pricing page has been advertising all along via
 * PartnerType.planTierByPage. Until now nothing read that map at request
 * time, so every page of an enabled module was reachable on every plan.
 *
 * These two functions close that. They are the tier-level sibling of
 * assertModuleAccess: same fail-closed posture, same partnerId-first
 * calling convention.
 * ------------------------------------------------------------------ */

export class PageTierError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PageTierError";
  }
}

export type PageTierAccess = {
  allowed: boolean;
  /** The tier this partner's current plan resolves to. */
  heldTier: import("@/lib/designer/pageTiers").PlanTier;
  /** The tier the page needs. */
  requiredTier: import("@/lib/designer/pageTiers").PlanTier;
  /** For the upgrade CTA's /pricing?type=... link. */
  partnerTypeId: string;
  /** Name of the cheapest plan in this type's ladder that would unlock the page. */
  upgradePlanName: string | null;
};

/**
 * Resolves the tier a partner currently holds, plus the tier a given page
 * requires, without throwing — so a page can render an upgrade prompt
 * instead of an error.
 *
 * Tier resolution order:
 *   1. Partner.planId -> its index within PartnerType.planIds ordered by
 *      price ascending -> tierForPlanIndex(). (A Plan row carries no tier
 *      column; position in the type's own ladder IS the tier — the same
 *      rule /pricing renders its columns with.)
 *   2. A partner still on "Trial" with no plan chosen yet gets the top
 *      tier of their type's ladder. A trial that silently hides the paid
 *      features is a trial that never converts; this is deliberate, and it
 *      ends on its own when trialEndAt passes and a real planId is set.
 *   3. Anything unresolvable (no plan, no type, cancelled) falls to
 *      "basic" — fail closed.
 *
 * Required tier comes from the partner's own PartnerType.planTierByPage
 * first (a Super Admin can deviate per type from /admin/partner-types),
 * falling back to DEFAULT_PAGE_TIERS. A page id in neither map is "basic",
 * i.e. ungated — so adding a new page never accidentally locks it.
 */
export async function getPageTierAccess(partnerId: string, pageId: string): Promise<PageTierAccess> {
  const { DEFAULT_PAGE_TIERS, tierForPlanIndex, tierSatisfies } = await import("@/lib/designer/pageTiers");
  type Tier = import("@/lib/designer/pageTiers").PlanTier;
  const { getPartner } = await import("@/lib/partnerData");
  const { getPartnerType } = await import("@/lib/designer/partnerTypesData");
  const { listPlans } = await import("@/lib/plansData");

  const partner = await getPartner(partnerId);
  const partnerTypeId = partner?.partnerTypeId ?? "";
  const partnerType = partnerTypeId ? await getPartnerType(partnerTypeId) : undefined;

  const requiredTier: Tier =
    (partnerType?.planTierByPage?.[pageId] as Tier | undefined) ?? DEFAULT_PAGE_TIERS[pageId] ?? "basic";

  // The type's ladder: its bundled plans, cheapest first.
  const allPlans = await listPlans(); // already ordered by price asc
  const ladder = partnerType ? allPlans.filter((p) => partnerType.planIds.includes(p.id)) : [];

  let heldTier: Tier = "basic";
  if (partner) {
    const index = partner.planId ? ladder.findIndex((p) => p.id === partner.planId) : -1;
    if (index >= 0) {
      heldTier = tierForPlanIndex(index, ladder.length);
    } else if (partner.subscriptionStatus === "Trial" && ladder.length > 0) {
      heldTier = tierForPlanIndex(ladder.length - 1, ladder.length);
    }
  }

  const upgradePlan = ladder.find((_, i) => tierSatisfies(tierForPlanIndex(i, ladder.length), requiredTier));

  return {
    allowed: tierSatisfies(heldTier, requiredTier),
    heldTier,
    requiredTier,
    partnerTypeId,
    upgradePlanName: upgradePlan?.name ?? null,
  };
}

/**
 * The throwing form, for Server Actions and any data-access path where
 * rendering an upgrade prompt isn't possible. Pages should prefer
 * getPageTierAccess() + <UpgradeGate> so the partner sees a real upgrade
 * offer rather than an error page.
 */
export async function assertPageTierAccess(partnerId: string, pageId: string): Promise<void> {
  const access = await getPageTierAccess(partnerId, pageId);
  if (!access.allowed) {
    throw new PageTierError(
      `Plan tier too low: partner "${partnerId}" is on "${access.heldTier}" but page "${pageId}" requires "${access.requiredTier}".`
    );
  }
}
