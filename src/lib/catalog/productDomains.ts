/**
 * Product domains — what kind of thing a Service Centre partner actually
 * services.
 *
 * WHY THIS IS A PARTNER-LEVEL FIELD AND NOT A SEPARATE PartnerType
 * ----------------------------------------------------------------
 * The obvious alternative was to fork "Service Centre" into two
 * PartnerTypes ("Service Centre — Electronics" / "Service Centre —
 * Automobile"), since PartnerType already carries idPrefix, defaultModules,
 * assignableRoleIds, planIds and planTierByPage. That was rejected:
 *
 *  - A real repair business commonly services both (a neighbourhood shop
 *    doing phones AND two-wheelers is ordinary, not an edge case). Two
 *    PartnerTypes would force such a partner to pick one, or to hold two
 *    separate accounts with two separate Partner ids and two bills.
 *  - Everything PartnerType exists to vary — which modules are on, which
 *    Roles can be assigned, which Plans and per-page tiers apply — is
 *    IDENTICAL for both domains. Forking the type would duplicate all of
 *    that config with nothing actually different in it, and every future
 *    Service Centre change would have to be made twice.
 *  - The partner picks this at signup, about their OWN business, and can
 *    change it later when they start taking on a new kind of work. That is
 *    partner-level profile data, the same shape as businessCategory — not
 *    a platform-level account classification a Super Admin owns.
 *  - Plan gating is unaffected: the Brand/Model catalog pages stay one set
 *    of pages on one set of `service-centre.brands.*` / `.models.*` tier
 *    keys (see DEFAULT_PAGE_TIERS), serving both domains. A second
 *    PartnerType, or a second pair of catalog modules, would mean a second
 *    gate to keep in sync forever.
 *
 * Stored on Partner.productDomains as a JSON string array of these codes.
 */

export const PRODUCT_DOMAINS = ["ELECTRONICS", "AUTOMOBILE"] as const;

export type ProductDomain = (typeof PRODUCT_DOMAINS)[number];

export const PRODUCT_DOMAIN_LABELS: Record<ProductDomain, string> = {
  ELECTRONICS: "Electronics & Appliances",
  AUTOMOBILE: "Automobiles & Vehicles",
};

/** Short form used to tag catalog rows and prefix mixed dropdown labels. */
export const PRODUCT_DOMAIN_SHORT_LABELS: Record<ProductDomain, string> = {
  ELECTRONICS: "Electronics",
  AUTOMOBILE: "Automobile",
};

export const PRODUCT_DOMAIN_DESCRIPTIONS: Record<ProductDomain, string> = {
  ELECTRONICS:
    "Phones, laptops, TVs, ACs, washing machines and other consumer electronics or home appliances.",
  AUTOMOBILE:
    "Two-wheelers, cars, commercial vehicles and other road vehicles.",
};

export function isProductDomain(value: unknown): value is ProductDomain {
  return typeof value === "string" && (PRODUCT_DOMAINS as readonly string[]).includes(value);
}

/**
 * Normalises whatever came back from the Partner.productDomains JSON
 * column into a clean, de-duplicated, order-stable ProductDomain[].
 *
 * A partner who has never chosen (every row that predates this column, and
 * anyone who unticks everything) comes back as ELECTRONICS only: that is
 * what the Service Centre module has always been, so an un-migrated
 * account keeps seeing exactly the catalog it saw before rather than
 * suddenly losing its Device Type list or gaining vehicle entries.
 */
export function parseProductDomains(value: unknown): ProductDomain[] {
  const raw = Array.isArray(value) ? value : [];
  const picked = PRODUCT_DOMAINS.filter((d) => raw.includes(d));
  return picked.length > 0 ? [...picked] : ["ELECTRONICS"];
}
