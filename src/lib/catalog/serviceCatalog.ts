/**
 * Bridges a partner's chosen product domain(s) to the option lists the
 * Service Centre module renders — the workorder intake form's "Device Type"
 * dropdown and the Brand/Model catalog.
 *
 * The two taxonomies stay physically separate (electronics:
 * DEVICE_CATEGORIES in sample-data/service-centre.ts, verified-real and
 * electronics-only; automobile: VEHICLE_CATEGORIES in ./vehicleCategory.ts,
 * a deliberate MBF extension). They are only ever combined HERE, at render
 * time, and always with an explicit domain group label so the two can't be
 * confused for one list.
 *
 * Every category code is unique across the two lists, so a stored
 * deviceCategory value is unambiguous without carrying its domain
 * alongside it.
 */
import {
  DEVICE_CATEGORIES,
  DEVICE_CATEGORY_LABELS,
} from "@/lib/sample-data/service-centre";
import {
  VEHICLE_CATEGORIES,
  VEHICLE_CATEGORY_GROUPS,
  VEHICLE_CATEGORY_LABELS,
} from "./vehicleCategory";
import {
  PRODUCT_DOMAIN_LABELS,
  type ProductDomain,
} from "./productDomains";

/**
 * Label lookup covering BOTH taxonomies — for read-only surfaces (workorder
 * detail, printed job sheet, reports) that just need to render whatever
 * category a record happens to hold, regardless of which domain it came
 * from or what the partner deals in today.
 */
export const ALL_SERVICE_CATEGORY_LABELS: Record<string, string> = {
  ...DEVICE_CATEGORY_LABELS,
  ...VEHICLE_CATEGORY_LABELS,
};

/** Which domain a stored category code belongs to, or undefined if unknown. */
export function domainOfCategory(code: string): ProductDomain | undefined {
  if ((DEVICE_CATEGORIES as readonly string[]).includes(code)) return "ELECTRONICS";
  if ((VEHICLE_CATEGORIES as readonly string[]).includes(code)) return "AUTOMOBILE";
  return undefined;
}

export type CategoryOptionSet = {
  options: string[];
  optionLabels: Record<string, string>;
  /** value -> <optgroup> heading. Only populated when more than one group is in play. */
  optionGroups?: Record<string, string>;
};

/**
 * The Device Type option set for a partner dealing in `domains`.
 *
 * Single domain: a flat list, exactly as before this feature existed — an
 * electronics-only partner sees the same 45 categories and no vehicle
 * entries, and an automobile-only partner sees only vehicle classes.
 *
 * Both domains: one select with <optgroup> headings — electronics under a
 * single heading, vehicles split by their own coarse groups (Two-Wheeler /
 * Car / Commercial / Farm & Construction), which is what makes a combined
 * 60-entry list navigable.
 */
export function categoryOptionsForDomains(domains: ProductDomain[]): CategoryOptionSet {
  const electronics = domains.includes("ELECTRONICS");
  const automobile = domains.includes("AUTOMOBILE");

  if (automobile && !electronics) {
    return {
      options: [...VEHICLE_CATEGORIES],
      optionLabels: VEHICLE_CATEGORY_LABELS,
      optionGroups: VEHICLE_CATEGORY_GROUPS,
    };
  }
  if (!automobile) {
    // `optionGroups: undefined` is explicit, not incidental: callers SPREAD
    // this result over a base field config that carries the combined
    // ALL_CATEGORY_GROUPS map. Omitting the key would leave that map in
    // place and wrongly nest a single-domain partner's flat list under an
    // "Electronics" heading — the exact bug this line prevents.
    return { options: [...DEVICE_CATEGORIES], optionLabels: DEVICE_CATEGORY_LABELS, optionGroups: undefined };
  }

  const optionGroups: Record<string, string> = {};
  for (const code of DEVICE_CATEGORIES) optionGroups[code] = PRODUCT_DOMAIN_LABELS.ELECTRONICS;
  for (const code of VEHICLE_CATEGORIES) {
    optionGroups[code] = `Automobiles — ${VEHICLE_CATEGORY_GROUPS[code] ?? "Other"}`;
  }
  return {
    options: [...DEVICE_CATEGORIES, ...VEHICLE_CATEGORIES],
    optionLabels: ALL_SERVICE_CATEGORY_LABELS,
    optionGroups,
  };
}

/**
 * Every category LABEL a partner's domains cover — used to scope the
 * Brand catalog's own "Device Type" picker (that field stores the human
 * label, not the code) and to filter catalog rows down to the domains the
 * partner actually works in.
 */
export function categoryLabelsForDomains(domains: ProductDomain[]): string[] {
  const set = categoryOptionsForDomains(domains);
  return set.options.map((code) => set.optionLabels[code] ?? code);
}
