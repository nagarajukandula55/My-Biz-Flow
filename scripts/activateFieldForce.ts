/**
 * One-off: creates a real, signup-able "field-force" PartnerType (none
 * existed yet — unlike Telecalling, which pre-existed as Draft) with real
 * Plan pricing, same mechanism Service Centre/Telecalling already use.
 * Field Force itself (skilled/unskilled provider onboarding, service
 * catalog, bookings, dispatch by pincode, ratings) is already fully built
 * — src/app/partner/[partnerId]/field-force/* — this just gives it a
 * front door. Pricing is a reasonable placeholder, fully editable from
 * Admin -> Plans / Admin -> Partner Types afterwards.
 * Run once: npx tsx scripts/activateFieldForce.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const plans = [
    {
      id: "PLAN-FIELDFORCE-BASIC",
      name: "Field Force Starter",
      price: 799,
      launchPrice: 399,
      billingCycle: "yearly" as const,
      includedModuleSlugs: ["field-force"],
      maxUsers: 5,
      maxLocations: 1,
      isPublic: true,
    },
    {
      id: "PLAN-FIELDFORCE-PRO",
      name: "Field Force Pro",
      price: 1499,
      launchPrice: 749,
      billingCycle: "yearly" as const,
      includedModuleSlugs: ["field-force"],
      maxUsers: 20,
      maxLocations: 1,
      isPublic: true,
    },
    {
      id: "PLAN-FIELDFORCE-ULTIMATE",
      name: "Field Force Ultimate",
      price: 2999,
      launchPrice: 1499,
      billingCycle: "yearly" as const,
      includedModuleSlugs: ["field-force"],
      maxUsers: 9999,
      maxLocations: 9999,
      isPublic: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: plan });
    console.log(`Upserted plan ${plan.id}`);
  }

  await prisma.partnerType.upsert({
    where: { id: "field-force" },
    create: {
      id: "field-force",
      description:
        "Field Force: a full home-services booking system — priced service catalog, customer bookings, dispatch of skilled or unskilled engineers by service and pincode, payment collection, and ratings.",
      defaultModules: ["field-force"],
      assignableRoleIds: [],
      planTierByPage: {},
      planIds: plans.map((p) => p.id),
      idPrefix: "FF",
      requiresApproval: true,
      status: "Active",
    },
    update: {
      status: "Active",
      planIds: plans.map((p) => p.id),
    },
  });
  console.log("field-force PartnerType is Active with real pricing.");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
