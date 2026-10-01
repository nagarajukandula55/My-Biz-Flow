/**
 * One-off seed: creates 5 new standalone, self-serve PartnerTypes for
 * modules that were previously cross-cutting add-ons only (loyalty-rewards,
 * marketplace, hrms) or admin-provisioned only (brand), plus a standalone
 * "billing" type bundling billing+inventory+accounting at its higher tiers
 * — per explicit user direction (2026-10-01 session): any business that
 * only needs one of these should be able to sign up for it on its own,
 * without needing a full vertical module.
 *
 * Idempotent: skips any PartnerType id or Plan id that already exists
 * (checked live against the DB before writing), so this is safe to re-run
 * and safe to run alongside scripts/seed-final-vertical-partner-types.ts
 * (which already defines its own "billing"/"loyalty-rewards" rows with a
 * stricter "no bundling" philosophy — if THAT script runs first, this one
 * will skip those 2 ids rather than overwrite them; run this script first
 * if the bundled-billing/cross-sell-loyalty design here is the one wanted).
 *
 * Pricing model: Plan.price/launchPrice are MONTHLY base rates (confirmed
 * via src/lib/subscriptionData.ts's currentMonthlyRate/computeCyclePrice —
 * the real Yearly/TwoYearly prices shown to a customer are computed from
 * this monthly rate with a 35%/55% multi-year discount, already wired up
 * platform-wide; no separate 1yr/2yr Plan rows needed here). launchPrice
 * applies until LAUNCH_PRICING_CUTOVER (2027-03-01, src/lib/
 * subscriptionData.ts), after which `price` applies automatically.
 *
 * Unique idPrefixes for nextPartnerId() (src/lib/partnerData.ts) — checked
 * against every existing PartnerType row's idPrefix live before writing:
 *   billing         -> BIL
 *   loyalty-rewards -> LOY
 *   marketplace     -> MKT
 *   hrms            -> HRM
 *   brand           -> BRN  (not "BRD" -- that's already used as a
 *                            NumberingCounter documentType prefix for
 *                            service-centre's Brand catalog rows, a
 *                            different namespace, but kept distinct here
 *                            to avoid any confusion between the two)
 *
 * Unexecuted by design — per this repo's database-safety rules (CLAUDE.md),
 * a human runs this after reviewing it: `npx tsx scripts/seed-standalone-addon-partner-types.ts`
 */
import { prisma } from "@/lib/prisma";

const KNOWN_PREFIXES = ["SC", "CC", "FF", "MFG", "WSB", "EVB", "LGL", "EDU", "CLN", "AMC", "RPO", "SPA", "POS"];
const NEW_PREFIXES: Record<string, string> = {
  billing: "BIL",
  "loyalty-rewards": "LOY",
  marketplace: "MKT",
  hrms: "HRM",
  brand: "BRN",
};

type PlanSeed = {
  id: string;
  name: string;
  price: number;
  launchPrice: number;
  includedModuleSlugs: string[];
  maxUsers: number;
  maxLocations: number;
};

type TypeSeed = {
  id: string;
  description: string;
  defaultModules: string[];
  plans: PlanSeed[];
};

const TYPES: TypeSeed[] = [
  {
    id: "loyalty-rewards",
    description:
      "Loyalty & Rewards: a standalone points/cashback program for retail shops, salons, restaurants, and gyms that want to reward repeat customers without buying a full POS or vertical module. Best for: any customer-facing business wanting to run its own loyalty scheme independently.",
    defaultModules: ["loyalty-rewards"],
    plans: [
      { id: "PLAN-LOYALTY-BASIC", name: "Starter", price: 349, launchPrice: 149, includedModuleSlugs: ["loyalty-rewards"], maxUsers: 1, maxLocations: 1 },
      { id: "PLAN-LOYALTY-PRO", name: "Pro", price: 699, launchPrice: 299, includedModuleSlugs: ["loyalty-rewards", "billing"], maxUsers: 5, maxLocations: 1 },
      { id: "PLAN-LOYALTY-ULTIMATE", name: "Ultimate", price: 1299, launchPrice: 549, includedModuleSlugs: ["loyalty-rewards", "billing", "marketplace"], maxUsers: 9999, maxLocations: 9999 },
    ],
  },
  {
    id: "marketplace",
    description:
      "Marketplace / Partner Aggregator: coordinates multiple vendors or partners under one umbrella, standalone from any other vertical. Best for: local service aggregators, multi-brand retail aggregators, or anyone running a marketplace of other sellers rather than their own single storefront.",
    defaultModules: ["marketplace"],
    plans: [
      { id: "PLAN-MARKETPLACE-BASIC", name: "Starter", price: 699, launchPrice: 299, includedModuleSlugs: ["marketplace"], maxUsers: 3, maxLocations: 1 },
      { id: "PLAN-MARKETPLACE-PRO", name: "Pro", price: 1399, launchPrice: 599, includedModuleSlugs: ["marketplace", "billing"], maxUsers: 10, maxLocations: 3 },
      { id: "PLAN-MARKETPLACE-ULTIMATE", name: "Ultimate", price: 2299, launchPrice: 999, includedModuleSlugs: ["marketplace", "billing", "accounting"], maxUsers: 9999, maxLocations: 9999 },
    ],
  },
  {
    id: "hrms",
    description:
      "HRMS / Payroll: standalone staff attendance, leave, and payroll management for any business, independent of other modules. Best for: any India-based team needing attendance tracking and payroll compiled into payslips, without needing a POS/service/billing module alongside it.",
    defaultModules: ["hrms"],
    plans: [
      { id: "PLAN-HRMS-BASIC", name: "Starter", price: 599, launchPrice: 249, includedModuleSlugs: ["hrms"], maxUsers: 10, maxLocations: 1 },
      { id: "PLAN-HRMS-PRO", name: "Pro", price: 1199, launchPrice: 549, includedModuleSlugs: ["hrms", "billing"], maxUsers: 50, maxLocations: 3 },
      { id: "PLAN-HRMS-ULTIMATE", name: "Ultimate", price: 2199, launchPrice: 999, includedModuleSlugs: ["hrms", "billing", "accounting"], maxUsers: 9999, maxLocations: 9999 },
    ],
  },
  {
    id: "brand",
    description:
      "Brand / Multi-Location: centralized control across a franchise or multi-branch business — Brand -> Partners -> Locations hierarchy. Best for: franchise owners or multi-branch retail/service businesses that need one dashboard across every outlet instead of managing each branch's account separately.",
    defaultModules: ["brand"],
    plans: [
      { id: "PLAN-BRAND-BASIC", name: "Starter", price: 899, launchPrice: 399, includedModuleSlugs: ["brand"], maxUsers: 5, maxLocations: 3 },
      { id: "PLAN-BRAND-PRO", name: "Pro", price: 1699, launchPrice: 799, includedModuleSlugs: ["brand", "billing"], maxUsers: 20, maxLocations: 10 },
      { id: "PLAN-BRAND-ULTIMATE", name: "Ultimate", price: 2999, launchPrice: 1399, includedModuleSlugs: ["brand", "billing", "accounting", "inventory"], maxUsers: 9999, maxLocations: 9999 },
    ],
  },
  {
    id: "billing",
    description:
      "Billing: a full standalone GST invoicing + accounting + inventory suite for any business that just needs to bill and track stock — no POS, no service jobs, no vertical module required. Best for: freelancers, consultants, traders, and small service providers who only need invoices/quotations/credit-notes, with accounting and inventory available as you grow.",
    defaultModules: ["billing"],
    plans: [
      { id: "PLAN-BILLING-BASIC", name: "Starter", price: 699, launchPrice: 299, includedModuleSlugs: ["billing"], maxUsers: 1, maxLocations: 1 },
      { id: "PLAN-BILLING-PRO", name: "Pro", price: 1399, launchPrice: 599, includedModuleSlugs: ["billing", "inventory"], maxUsers: 5, maxLocations: 1 },
      { id: "PLAN-BILLING-ULTIMATE", name: "Ultimate", price: 2299, launchPrice: 999, includedModuleSlugs: ["billing", "inventory", "accounting", "accounting-gst"], maxUsers: 9999, maxLocations: 9999 },
    ],
  },
];

async function main() {
  const existingTypes = await prisma.partnerType.findMany({ select: { id: true, idPrefix: true } });
  const existingTypeIds = new Set(existingTypes.map((t) => t.id));
  const existingPrefixes = new Set([...existingTypes.map((t) => t.idPrefix), ...KNOWN_PREFIXES]);

  for (const type of TYPES) {
    const prefix = NEW_PREFIXES[type.id];
    if (existingPrefixes.has(prefix) && !existingTypeIds.has(type.id)) {
      throw new Error(`idPrefix collision: "${prefix}" for new type "${type.id}" already used by an existing PartnerType — aborting before writing anything.`);
    }
  }

  for (const type of TYPES) {
    if (existingTypeIds.has(type.id)) {
      console.log(`SKIP PartnerType "${type.id}" — already exists.`);
    } else {
      await prisma.partnerType.create({
        data: {
          id: type.id,
          description: type.description,
          defaultModules: type.defaultModules,
          idPrefix: NEW_PREFIXES[type.id],
          requiresApproval: false,
          status: "Active",
          planIds: type.plans.map((p) => p.id),
        },
      });
      console.log(`CREATED PartnerType "${type.id}" (prefix ${NEW_PREFIXES[type.id]}), plans: ${type.plans.map((p) => p.id).join(", ")}`);
    }

    for (const plan of type.plans) {
      const existingPlan = await prisma.plan.findUnique({ where: { id: plan.id } });
      if (existingPlan) {
        console.log(`  SKIP Plan "${plan.id}" — already exists.`);
        continue;
      }
      await prisma.plan.create({
        data: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          launchPrice: plan.launchPrice,
          billingCycle: "yearly",
          includedModuleSlugs: plan.includedModuleSlugs,
          maxUsers: plan.maxUsers,
          maxLocations: plan.maxLocations,
          isPublic: true,
        },
      });
      console.log(`  CREATED Plan "${plan.id}" (₹${plan.launchPrice}→₹${plan.price}/mo)`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
