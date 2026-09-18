/**
 * One-off: fixes the "field-force" PartnerType's pricing model. Field
 * Force isn't a per-partner subscription business the way Service Centre/
 * Telecalling are — it's a commission marketplace: the platform already
 * takes a cut of every booking (flat/percent, charged to customer/
 * provider/split — see /admin/field-force-fee, src/lib/fieldForce/
 * commission.ts), configured once, platform-wide. Charging a subscription
 * ON TOP of that (the original Basic/Pro/Ultimate plans this script used
 * to create) double-charges and contradicts "anybody can sign up, no
 * pricing to join." Replaces those three paid plans with one Free plan.
 * Run once: npx tsx scripts/activateFieldForce.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const freePlan = {
    id: "PLAN-FIELDFORCE-FREE",
    name: "Field Force",
    price: 0,
    launchPrice: null,
    billingCycle: "yearly" as const,
    includedModuleSlugs: ["field-force"],
    maxUsers: 9999,
    maxLocations: 9999,
    isPublic: true,
  };

  await prisma.plan.upsert({ where: { id: freePlan.id }, create: freePlan, update: freePlan });
  console.log(`Upserted plan ${freePlan.id}`);

  for (const staleId of ["PLAN-FIELDFORCE-BASIC", "PLAN-FIELDFORCE-PRO", "PLAN-FIELDFORCE-ULTIMATE"]) {
    await prisma.plan.deleteMany({ where: { id: staleId } });
  }
  console.log("Removed the old paid Field Force plans.");

  await prisma.partnerType.upsert({
    where: { id: "field-force" },
    create: {
      id: "field-force",
      description:
        "Field Force: free to join. Providers (skilled or unskilled) sign up and get a login to receive and manage jobs; customers request service through their own app. The platform earns a small commission per completed booking (see Admin > Field Force Platform Commission), not a subscription fee.",
      defaultModules: ["field-force"],
      assignableRoleIds: [],
      planTierByPage: {},
      planIds: [freePlan.id],
      idPrefix: "FF",
      requiresApproval: true,
      status: "Active",
    },
    update: {
      status: "Active",
      planIds: [freePlan.id],
      description:
        "Field Force: free to join. Providers (skilled or unskilled) sign up and get a login to receive and manage jobs; customers request service through their own app. The platform earns a small commission per completed booking (see Admin > Field Force Platform Commission), not a subscription fee.",
    },
  });
  console.log("field-force PartnerType is Active, free to join.");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
