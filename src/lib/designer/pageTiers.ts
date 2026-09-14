/**
 * The canonical pageId -> required PlanTier map, and the tier arithmetic
 * that turns a partner's actual subscribed Plan into a tier.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `PartnerType.planTierByPage` (a Json column, editable per type from
 * /admin/partner-types) has always been the *storage* for this, but until
 * now nothing read it at request time — the only consumers were the admin
 * editor and the marketing bullets on /pricing. The tier split itself was
 * defined once, as a literal inside scripts/seed-launch-data.ts's
 * SERVICE_CENTRE_PAGES, which meant the split only existed in a database
 * row that a given environment may or may not have been seeded with.
 *
 * DEFAULT_PAGE_TIERS below is that same map lifted out of the seed script
 * into importable code, so there is exactly one source of truth:
 *   - the seed script imports it (it no longer owns a literal of its own),
 *   - runtime enforcement (assertPageTierAccess, src/lib/tenant.ts) reads
 *     the partner type's stored planTierByPage FIRST and falls back to
 *     this map, so a page tier is enforced correctly even in an
 *     environment whose partner_types row predates the entry.
 *
 * Deliberately NOT listed here (= "basic", reachable on every plan): the
 * workorder core (service-centre.list/create/detail), solutions, the
 * dashboard, and settings. Gating the thing a partner bought the product
 * for is not a pricing tier, it's a broken product.
 *
 * Staff-login page ids that the original seed literal carried
 * (service-centre.staff*) are intentionally dropped — those routes no
 * longer exist, and separate multi-account staff login stays out of scope.
 * `service-centre.staff-names.*` below is NOT that: it gates a plain list of
 * names used as suggestions on a workorder's who-did-this fields, with no
 * credential or session of any kind behind it.
 */

export type PlanTier = "basic" | "pro" | "ultimate";

/** basic < pro < ultimate. Used for the "is the partner's tier at least
 *  what this page requires" comparison — never compare the strings. */
export const TIER_RANK: Record<PlanTier, number> = { basic: 0, pro: 1, ultimate: 2 };

export const TIER_LABEL: Record<PlanTier, string> = {
  basic: "Basic",
  pro: "Pro",
  ultimate: "Ultimate",
};

export const DEFAULT_PAGE_TIERS: Record<string, PlanTier> = {
  // --- Service Centre (verbatim from the original SERVICE_CENTRE_PAGES) ---
  "service-centre.list": "basic",
  "service-centre.create": "basic",
  "service-centre.detail": "basic",
  "service-centre.solutions.list": "basic",
  "service-centre.solutions.create": "basic",
  "service-centre.fault-codes.list": "pro",
  "service-centre.fault-codes.create": "pro",
  "service-centre.symptom-codes.list": "pro",
  "service-centre.symptom-codes.create": "pro",
  "service-centre.brands.list": "pro",
  "service-centre.brands.create": "pro",
  "service-centre.models.list": "pro",
  "service-centre.models.create": "pro",
  // Same Pro gate as Brands/Models, for the same reason: a Starter partner
  // types the name free-text every time, a Pro+ partner keeps a roster and
  // picks from it.
  "service-centre.staff-names.list": "pro",
  "service-centre.staff-names.create": "pro",
  // SC Profiles (service-centre.sc-profile.*) and the Admin scaffold
  // (service-centre.admin) both removed — see modules.ts task notes.
  "service-centre.sub-scs": "ultimate",

  // --- Billing ---
  // Mapped against MODULE_TIER_FEATURES["service-centre"] (moduleTiers.ts),
  // which is itself adapted from AN-CRM's live plan ladder: Starter is
  // "workorder + invoicing only", Pro adds "Quotations, Credit/Debit Notes,
  // Delivery Challans", Ultimate adds "Ledger Book, Profit & Loss reports
  // and expense tracking". So core invoicing/contacts/items/payments stay
  // basic, the extra sales documents are pro, and expenses + P&L are
  // ultimate — no invented list, just that ladder applied to page ids.
  "billing.quotations.list": "pro",
  "billing.quotations.create": "pro",
  "billing.delivery-challans.list": "pro",
  "billing.delivery-challans.create": "pro",
  "billing.proforma-invoices.list": "pro",
  "billing.proforma-invoices.create": "pro",
  "billing.credit-notes.list": "pro",
  "billing.credit-notes.create": "pro",
  "billing.recurring.list": "pro",
  "billing.recurring.create": "pro",
  "billing.expenses.list": "ultimate",
  "billing.expenses.create": "ultimate",

  // --- Inventory ---
  // BOM/material-catalog authoring (not the workorder's own free-text
  // material entry, which stays basic) is the same "build your own
  // catalog" capability Brands/Models already gate pro+.
  "inventory.bom.create": "pro",
  "billing.reports.profit-loss": "ultimate",
};

/**
 * Which tier a plan represents *within its partner type's own ladder*.
 *
 * There is no tier column on `Plan` — a Plan row is just name/price/modules,
 * and the same Plan can be bundled by more than one PartnerType. The tier
 * is therefore positional: PartnerType.planIds, ordered by price ascending,
 * is the type's ladder, and a plan's index in it is its tier.
 *
 * This is the exact rule /pricing already renders its Basic/Pro/Ultimate
 * columns with (it lived inline there as tierForPlanIndex) — hoisted here
 * so the marketing page and the enforcement path can never disagree about
 * which plan is which tier.
 */
export function tierForPlanIndex(index: number, total: number): PlanTier {
  if (total <= 1) return "basic";
  if (index === 0) return "basic";
  if (index === total - 1) return "ultimate";
  return "pro";
}

/** True when `held` satisfies a page requiring `required`. */
export function tierSatisfies(held: PlanTier, required: PlanTier): boolean {
  return TIER_RANK[held] >= TIER_RANK[required];
}
