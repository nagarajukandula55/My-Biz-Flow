/**
 * One-off launch seed: creates the Plan rows and the Service Centre
 * PartnerType row that a fresh production database has none of (the
 * signup page reads real `PartnerType`/`Plan` rows — an empty DB means
 * "No business types are open for signup yet").
 *
 * Idempotent: every write is an upsert keyed by id, safe to re-run.
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
  const plans = [
    { id: "PLAN-BASIC", name: "Basic", price: 99900, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory"], maxUsers: 2, maxLocations: 1, isPublic: true },
    { id: "PLAN-PRO", name: "Pro", price: 249900, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory", "billing"], maxUsers: 10, maxLocations: 3, isPublic: true },
    { id: "PLAN-ULTIMATE", name: "Ultimate", price: 499900, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory", "billing", "accounting-gst"], maxUsers: 50, maxLocations: 10, isPublic: true },
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
