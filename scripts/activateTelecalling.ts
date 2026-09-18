/**
 * One-off: gives the existing (Draft, no pricing) "telecalling" PartnerType
 * real Plan pricing and flips it to Active, so it becomes a genuine,
 * signup-able business type — same mechanism Service Centre already uses
 * (PartnerType.planIds -> real Plan rows -> /pricing?type=telecalling and
 * /signup?type=telecalling render from live data, nothing hardcoded).
 * Pricing here is a reasonable placeholder, fully editable afterwards from
 * Admin -> Plans / Admin -> Partner Types — not a locked-in launch price.
 * Run once: npx tsx scripts/activateTelecalling.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const plans = [
    {
      id: "PLAN-TELECALLING-BASIC",
      name: "Telecalling Starter",
      price: 599,
      launchPrice: 299,
      billingCycle: "yearly" as const,
      includedModuleSlugs: ["telecalling"],
      maxUsers: 3,
      maxLocations: 1,
      isPublic: true,
    },
    {
      id: "PLAN-TELECALLING-PRO",
      name: "Telecalling Pro",
      price: 999,
      launchPrice: 499,
      billingCycle: "yearly" as const,
      includedModuleSlugs: ["telecalling"],
      maxUsers: 10,
      maxLocations: 1,
      isPublic: true,
    },
    {
      id: "PLAN-TELECALLING-ULTIMATE",
      name: "Telecalling Ultimate",
      price: 1999,
      launchPrice: 999,
      billingCycle: "yearly" as const,
      includedModuleSlugs: ["telecalling"],
      maxUsers: 9999,
      maxLocations: 9999,
      isPublic: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
    console.log(`Upserted plan ${plan.id}`);
  }

  await prisma.partnerType.update({
    where: { id: "telecalling" },
    data: {
      status: "Active",
      planIds: plans.map((p) => p.id),
    },
  });
  console.log("telecalling PartnerType set to Active with real pricing.");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
