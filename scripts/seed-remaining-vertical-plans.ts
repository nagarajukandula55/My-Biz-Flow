/**
 * One-off seed: creates the Basic/Pro/Ultimate Plan ladder for every
 * "vertical" PartnerType that was deliberately seeded earlier with
 * `planIds: []` (see seed-pos-partner-type.ts, seed-new-vertical-partner-types.ts,
 * seed-final-vertical-partner-types.ts, seed-more-vertical-partner-types.ts —
 * each left pricing for "a Super Admin to configure later via
 * /admin/partner-types"). This is that follow-up.
 *
 * Pricing shape is deliberate, not arbitrary, and the same across every
 * module here — a real, modest Starter tier (NOT a crippled trial: it gets
 * every core feature the module has), a Pro tier priced only a little
 * above Starter but carrying most of the real value (more seats/locations,
 * priority support, plus whatever's genuinely gated pro+ in
 * DEFAULT_PAGE_TIERS for that module), and an Ultimate tier priced well
 * above Pro for comparatively marginal extra value (unlimited seats,
 * dedicated onboarding) — a classic three-tier anchor: Ultimate's job is
 * to make Pro look like the obvious choice, not to be where most partners
 * are expected to land. Matches src/lib/designer/moduleTiers.ts's bullets
 * exactly (that file was written describing this same ladder).
 *
 * Two pricing bands:
 *   - "built" band (pos, manufacturing, wholesale-b2b): these three
 *     already have a real pro-gated feature (see pageTiers.ts), priced
 *     slightly higher to reflect that.
 *   - "standard" band (every other module here): no gated feature yet,
 *     differentiated by seats/locations/support only — priced one notch
 *     lower.
 *
 * Idempotent: every write is an upsert keyed by id, safe to re-run.
 * Does NOT run any prisma migrate/db push — Plan and PartnerType are
 * existing tables; this only writes rows into them.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-remaining-vertical-plans.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Band = "built" | "standard";

const BAND_PRICING: Record<Band, { basic: number; pro: number; ultimate: number }> = {
  built: { basic: 699, pro: 999, ultimate: 2999 },
  standard: { basic: 499, pro: 799, ultimate: 2499 },
};

const MODULES: { slug: string; idPrefix: string; band: Band; maxUsers: [number, number, number]; maxLocations: [number, number, number] }[] = [
  { slug: "pos", idPrefix: "POS", band: "built", maxUsers: [3, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "manufacturing", idPrefix: "MFG", band: "built", maxUsers: [3, 15, 9999], maxLocations: [1, 3, 9999] },
  { slug: "wholesale-b2b", idPrefix: "WSB", band: "built", maxUsers: [3, 15, 9999], maxLocations: [1, 3, 9999] },
  { slug: "event-booking", idPrefix: "EVB", band: "standard", maxUsers: [2, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "legal", idPrefix: "LGL", band: "standard", maxUsers: [3, 15, 9999], maxLocations: [1, 3, 9999] },
  { slug: "education", idPrefix: "EDU", band: "standard", maxUsers: [3, 15, 9999], maxLocations: [1, 3, 9999] },
  { slug: "subscriptions", idPrefix: "SUB", band: "standard", maxUsers: [2, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "real-estate", idPrefix: "RLE", band: "standard", maxUsers: [3, 15, 9999], maxLocations: [1, 9999, 9999] },
  { slug: "rentals", idPrefix: "RNT", band: "standard", maxUsers: [2, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "logistics-fleet", idPrefix: "LOG", band: "standard", maxUsers: [3, 15, 9999], maxLocations: [1, 5, 9999] },
  { slug: "clinic", idPrefix: "CLN", band: "standard", maxUsers: [2, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "amc-field-service", idPrefix: "AMC", band: "standard", maxUsers: [2, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "restaurant-pos", idPrefix: "RPO", band: "standard", maxUsers: [3, 10, 9999], maxLocations: [1, 3, 9999] },
  { slug: "salon-spa", idPrefix: "SPA", band: "standard", maxUsers: [2, 10, 9999], maxLocations: [1, 3, 9999] },
];

function slugToPlanPrefix(slug: string): string {
  return slug.toUpperCase().replace(/-/g, "");
}

async function main() {
  const existingTypes = await prisma.partnerType.findMany({ select: { id: true, idPrefix: true } });
  const byId = new Map(existingTypes.map((t) => [t.id, t.idPrefix]));

  for (const mod of MODULES) {
    const existingPrefix = byId.get(mod.slug);
    if (!existingPrefix) {
      console.log(`Skipping "${mod.slug}" — no existing PartnerType row (run its own seed script first).`);
      continue;
    }
    if (existingPrefix !== mod.idPrefix) {
      console.log(`Skipping "${mod.slug}" — expected idPrefix "${mod.idPrefix}" but found "${existingPrefix}"; check for drift before seeding plans.`);
      continue;
    }

    const prices = BAND_PRICING[mod.band];
    const planPrefix = slugToPlanPrefix(mod.slug);
    const plans = [
      { id: `PLAN-${planPrefix}-BASIC`, name: "Starter", price: prices.basic, maxUsers: mod.maxUsers[0], maxLocations: mod.maxLocations[0] },
      { id: `PLAN-${planPrefix}-PRO`, name: "Pro", price: prices.pro, maxUsers: mod.maxUsers[1], maxLocations: mod.maxLocations[1] },
      { id: `PLAN-${planPrefix}-ULTIMATE`, name: "Ultimate", price: prices.ultimate, maxUsers: mod.maxUsers[2], maxLocations: mod.maxLocations[2] },
    ];

    for (const plan of plans) {
      const data = {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        billingCycle: "monthly",
        includedModuleSlugs: [mod.slug],
        maxUsers: plan.maxUsers,
        maxLocations: plan.maxLocations,
        isPublic: true,
      };
      await prisma.plan.upsert({ where: { id: plan.id }, create: data, update: data });
      console.log(`Plan upserted: ${plan.id} (${plan.name}, ₹${plan.price}/mo)`);
    }

    await prisma.partnerType.update({
      where: { id: mod.slug },
      data: { planIds: plans.map((p) => p.id) },
    });
    console.log(`PartnerType "${mod.slug}" planIds updated: ${plans.map((p) => p.id).join(", ")}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
