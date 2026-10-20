/** Publishes the reviewed non-Service-Centre module catalog after human review. */
import { PrismaClient } from "@prisma/client";
import catalog from "../data/module-pricing-2026-10.cjs";

const prisma = new PrismaClient();
async function main() {
  for (const row of catalog.modules) {
    if (row.slug === "service-centre") continue;
    const existing = await prisma.partnerType.findUnique({ where: { id: row.slug } });
    const plans = row.prices.map((price: number, index: number) => ({
      id: `PLAN-${row.slug.toUpperCase().replaceAll("-", "")}-202610-${["BASIC", "PRO", "ULTIMATE"][index]}`,
      name: ["Starter", "Pro", "Ultimate"][index], price, billingCycle: "monthly" as const,
      includedModuleSlugs: existing?.defaultModules?.length ? existing.defaultModules : [row.slug],
      maxUsers: [2, 10, 25][index], maxLocations: [1, 3, 5][index], isPublic: true,
    }));
    for (const plan of plans) await prisma.plan.upsert({ where: { id: plan.id }, create: plan, update: plan });
    if (existing) await prisma.partnerType.update({ where: { id: row.slug }, data: { planIds: plans.map((p) => p.id), status: "Active" } });
    else await prisma.partnerType.create({ data: { id: row.slug, description: row.scope, defaultModules: [row.slug], assignableRoleIds: [], planTierByPage: {}, planIds: plans.map((p) => p.id), idPrefix: row.slug.slice(0, 3).toUpperCase(), requiresApproval: false, status: "Active" } });
    console.log(`${row.slug}: ${plans.map((p) => `₹${p.price}`).join(" / ")}`);
  }
}

main()
  .then(() => console.log("Published non-Service-Centre module pricing successfully."))
  .catch((error) => {
    console.error("Pricing publication failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
