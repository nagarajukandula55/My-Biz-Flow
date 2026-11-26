/**
 * Publish one verified public signup tier for Restaurant and Hotel.
 *
 * Safe by default: reads the live catalog and prints the proposed change.
 * Add --apply only after reviewing the output. The script creates/versioned
 * plans and changes only PartnerType.planIds (signup choices); it does not
 * modify existing Plan rows, partners, subscriptions, invoices, or business
 * records. No schema migration is required.
 *
 *   npx tsx scripts/publish-hotel-restaurant-pricing.ts
 *   npx tsx scripts/publish-hotel-restaurant-pricing.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const VERSION = "20261126";
const TARGETS = [
  { typeId: "restaurant-pos", planId: `PLAN-RESTAURANTPOS-LAUNCH-${VERSION}`, name: "Restaurant", price: 1499, launchPrice: 1299, modules: ["restaurant-pos", "billing"] },
  { typeId: "hotel", planId: `PLAN-HOTEL-LAUNCH-${VERSION}`, name: "Hotel", price: 1799, launchPrice: 1499, modules: ["hotel", "billing"] },
] as const;

async function main() {
  const changes = [] as Array<{ target: (typeof TARGETS)[number]; type: { id: string; idPrefix: string; status: string; planIds: unknown }; plan: Record<string, unknown> }>;
  for (const target of TARGETS) {
    const type = await prisma.partnerType.findUnique({ where: { id: target.typeId }, select: { id: true, idPrefix: true, status: true, planIds: true } });
    if (!type) throw new Error(`PartnerType "${target.typeId}" is missing. Create/enable the business type before publishing its plan.`);
    if (type.status !== "Active") throw new Error(`PartnerType "${target.typeId}" is ${type.status}; refusing to publish a plan.`);
    const plan = {
      id: target.planId,
      name: `${target.name} Standard`,
      price: target.price,
      launchPrice: target.launchPrice,
      billingCycle: "monthly",
      includedModuleSlugs: [...target.modules],
      maxUsers: 9999,
      maxLocations: 1,
      isPublic: true,
    };
    changes.push({ target, type, plan });
    console.log(`${target.name} (${type.idPrefix}):`);
    console.log(`  Current signup plan IDs: ${JSON.stringify(type.planIds)}`);
    console.log(`  Proposed: INR ${target.launchPrice}/month launch; INR ${target.price}/month standard, before GST`);
    console.log(`  Plan ID: ${target.planId}; included modules: ${target.modules.join(", ")}`);
    console.log(`  After the configured 55% two-year discount: INR ${(target.launchPrice * 0.45).toFixed(2)}/month equivalent during launch pricing, before GST`);
  }

  if (!apply) {
    console.log("Dry run only. Review the catalog above; rerun with --apply to publish these signup tiers.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const { target, plan } of changes) {
      await tx.plan.upsert({ where: { id: target.planId }, create: plan as never, update: plan as never });
      await tx.partnerType.update({ where: { id: target.typeId }, data: { planIds: [target.planId] } });
    }
  });
  console.log("Published the two signup tiers. Existing plans and existing customer subscriptions were not changed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
