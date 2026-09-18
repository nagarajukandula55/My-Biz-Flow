/**
 * Run this locally against a real DATABASE_URL to create the demo partner
 * (see src/lib/demoPartnerSeed.ts for the actual logic/what gets created —
 * this file is just the CLI entry point).
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/create-demo-partner.ts
 *
 * If your own machine/network can't reach the database directly (e.g. a
 * corporate DNS/security policy blocking the DB host), use
 * /api/admin/seed-demo-partner instead — same logic, runs on the deployed
 * app itself, which already has working DB access.
 */
import { prisma } from "../src/lib/prisma";
import { createDemoPartner } from "../src/lib/demoPartnerSeed";

async function main() {
  const result = await createDemoPartner();
  if (result.alreadyExisted) {
    console.log(`Partner "${result.partnerId}" already existed — data seeding is idempotent, nothing duplicated.`);
  } else {
    console.log(`Created partner "${result.partnerId}".`);
  }
  console.log("\nDemo partner ready:");
  console.log(`  Partner ID (login id): ${result.partnerId}`);
  console.log(`  Login contact: ${result.loginContact}`);
  console.log(`  Password: ${result.password}`);
  console.log(`  Log in at /login. Subscription is a 100-year Trial, so every Pro/Ultimate feature is unlocked with no plan/billing setup needed.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
