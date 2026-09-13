/**
 * One-off launch seed: creates the Plan rows and the Service Centre
 * PartnerType row that a fresh production database has none of (the
 * signup page reads real `PartnerType`/`Plan` rows — an empty DB means
 * "No business types are open for signup yet").
 *
 * Idempotent: every write is an upsert keyed by id, safe to re-run.
 *
 * Prices below are AN-CRM's real, currently-live Service Centre pricing
 * (standard/post-launch `monthlyPriceINR`, not its temporary
 * `launchPriceINR` introductory rate) — see AN-CRM's
 * src/core/pricing/plans.ts, the single source of truth that app's own
 * /pricing page renders from: Starter ₹799/mo, Pro ₹1,199/mo (AN-CRM's
 * internal plan key for this tier stays "BASIC" — same tier, different
 * label), Ultimate ₹2,499/mo. Module bundles/seat limits below are this
 * app's own approximation of AN-CRM's real per-tier gating (Starter has
 * no inventory/catalog at all — workorder + invoicing only; Ultimate is
 * the only tier with unlimited multi-location), not AN-CRM's own module
 * vocabulary, since My Biz Flow's module system doesn't share AN-CRM's.
 * My Biz Flow has no per-period (monthly/yearly/2-yearly) pricing table
 * or launch-pricing-cutover concept on the `Plan` model yet — only a
 * single flat price + billingCycle per plan — so AN-CRM's discounted
 * yearly/2-yearly framing and its temporary launch price are not carried
 * over here; this seeds the real standard monthly rate only.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-launch-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SERVICE_CENTRE_PAGES = {
  "service-centre.list": "basic",
  "service-centre.create": "basic",
  "service-centre.detail": "basic",
  "service-centre.solutions.list": "basic",
  "service-centre.fault-codes.list": "pro",
  "service-centre.symptom-codes.list": "pro",
  "service-centre.brands.list": "pro",
  "service-centre.models.list": "pro",
  "service-centre.sc-profile.list": "pro",
  "service-centre.staff.list": "pro",
  "service-centre.staff-login": "pro",
  "service-centre.staff-change-password": "pro",
  "service-centre.admin": "ultimate",
} as const;

async function main() {
  // Plan ids kept as PLAN-BASIC/PLAN-PRO/PLAN-ULTIMATE (matching this
  // app's basic/pro/ultimate PlanTier keys) even though the bottom tier's
  // real AN-CRM name is "Starter" — same reasoning AN-CRM itself used to
  // keep its own "BASIC" internal key while renaming the displayed plan
  // to "Pro": avoids a data migration on any PartnerType/subscription row
  // already referencing this id.
  const plans = [
    { id: "PLAN-BASIC", name: "Starter", price: 79900, billingCycle: "monthly", includedModuleSlugs: ["service-centre"], maxUsers: 1, maxLocations: 1, isPublic: true },
    { id: "PLAN-PRO", name: "Pro", price: 119900, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory", "billing"], maxUsers: 5, maxLocations: 1, isPublic: true },
    { id: "PLAN-ULTIMATE", name: "Ultimate", price: 249900, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory", "billing", "accounting-gst"], maxUsers: 9999, maxLocations: 9999, isPublic: true },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
    console.log(`Plan upserted: ${plan.id} (${plan.name}, ₹${plan.price / 100}/mo)`);
  }

  await prisma.partnerType.upsert({
    where: { id: "service-centre" },
    create: {
      id: "service-centre",
      description: "Repair/service shops running workorders, inventory, and GST billing.",
      defaultModules: ["service-centre", "inventory"],
      assignableRoleIds: [],
      planTierByPage: SERVICE_CENTRE_PAGES,
      planIds: plans.map((p) => p.id),
      idPrefix: "SC",
      requiresApproval: false,
      status: "Active",
    },
    update: {
      defaultModules: ["service-centre", "inventory"],
      planTierByPage: SERVICE_CENTRE_PAGES,
      planIds: plans.map((p) => p.id),
      idPrefix: "SC",
      status: "Active",
    },
  });
  console.log('PartnerType upserted: "service-centre" (idPrefix "SC", Active, open for signup)');

  console.log("\nDone. Reload /signup — Service Centre should now be selectable.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
