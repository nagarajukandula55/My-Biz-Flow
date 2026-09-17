/**
 * One-off backfill: corrects any already-stored `Plan` row (id PLAN-BASIC/
 * PLAN-PRO/PLAN-ULTIMATE) whose `price` and/or `name` drifted from the real,
 * currently-correct values in scripts/seed-launch-data.ts's LAUNCH_PLANS.
 *
 * Root cause (price): scripts/seed-launch-data.ts used to seed Plan.price in
 * paise (79900/119900/249900) before commit aadfc7c fixed it to plain rupees
 * (799/1199/2499) -- every consumer (/pricing, /subscribe, the partner
 * Subscription page, and the Razorpay order amount) treats `price` as plain
 * rupees directly, no /100 anywhere. That fix only changed the SEED SCRIPT's
 * literal, which only affects a fresh/re-seeded database -- it never touched
 * whatever is already sitting in the live production `plans` table, which is
 * what the partner-facing Subscription page actually reads (via listPlans()
 * in src/lib/plansData.ts).
 *
 * The live values reported off the production Subscription page (Basic
 * ₹99,900/mo, Pro ₹2,49,900/mo, Ultimate ₹4,49,900/mo) are NOT the same ×100
 * paise-bug amounts the old seed literal used (79900/119900/249900) -- they
 * divide out cleanly by 100 to 999/2499/4499, an OLDER price ladder that
 * predates even the 799/1199/2499 numbers. So live prod is carrying the same
 * class of paise-vs-rupees bug (×100), just applied on top of a stale/older
 * price table that was never updated to today's real 799/1199/2499 rates
 * either -- two generations of drift stacked on the same row, not two
 * separate bugs.
 *
 * Root cause (name): PLAN-BASIC's real display name has always been
 * "Starter" in this seed (AN-CRM's own internal "BASIC" plan key is
 * displayed as "Pro", not "Basic" -- this app's bottom tier is a distinct,
 * genuinely-limited plan called "Starter", see AN-CRM's
 * src/core/pricing/plans.ts). If the live `plans` row still has name
 * "Basic" it predates that naming convention (or was hand-entered) and was
 * never corrected either -- same "seed fixed, live row never re-synced"
 * gap as the price bug above.
 *
 * Detection is by id, not a generic "price > threshold" heuristic -- we know
 * exactly which 3 Plan rows exist and what they should be, so we correct
 * only a real mismatch against LAUNCH_PLANS rather than guessing at what
 * counts as "suspiciously large."
 *
 * Idempotent: safe to re-run -- a row already matching LAUNCH_PLANS is left
 * untouched and logged as already-correct.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/backfill-plan-prices.ts
 *
 * NOT run against production by the agent that wrote this -- no live
 * DATABASE_URL was available in that sandbox. Run this once, by someone
 * with real DB access (or via this project's Neon DNS-workaround
 * connection, on explicit go-ahead), to correct the rows the live
 * Subscription page is currently reading.
 */
import { PrismaClient } from "@prisma/client";
import { LAUNCH_PLANS } from "./seed-launch-data";

const prisma = new PrismaClient();

async function main() {
  let fixed = 0;
  let alreadyCorrect = 0;

  for (const correct of LAUNCH_PLANS) {
    const existing = await prisma.plan.findUnique({ where: { id: correct.id } });
    if (!existing) {
      console.log(`Plan "${correct.id}" not found in the live database -- nothing to backfill for it (a fresh seed run would create it).`);
      continue;
    }

    const priceWrong = existing.price !== correct.price;
    const nameWrong = existing.name !== correct.name;

    if (!priceWrong && !nameWrong) {
      alreadyCorrect += 1;
      console.log(`Plan "${correct.id}" already correct: ${existing.name}, ₹${existing.price}/mo. No change.`);
      continue;
    }

    await prisma.plan.update({
      where: { id: correct.id },
      data: { price: correct.price, name: correct.name },
    });
    fixed += 1;

    const changes: string[] = [];
    if (nameWrong) changes.push(`name "${existing.name}" -> "${correct.name}"`);
    if (priceWrong) changes.push(`price ₹${existing.price} -> ₹${correct.price}`);
    console.log(`Plan "${correct.id}" corrected: ${changes.join(", ")}`);
  }

  console.log(`\nDone. ${fixed} Plan row(s) corrected, ${alreadyCorrect} already correct.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
