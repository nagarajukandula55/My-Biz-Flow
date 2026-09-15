/**
 * One-off correction: the 8 real partners migrated from AN-CRM earlier this
 * session were left on a blanket "Active + PLAN-ULTIMATE + Yearly" default
 * from the FIRST migration run — the later fix (resolveSubscription() in
 * migrate-an-crm-businesses-to-mbf.ts, commit a76bf9b) that reads each
 * vendor's REAL AN-CRM VendorSubscription.currentPeriodEnd was written but
 * never actually re-run with --confirm against production. This script
 * applies that same real-status correction directly, without importing
 * businessRecords.ts (whose listBusinessRecords is now wrapped in React's
 * cache() — not usable outside a real React render, breaks under plain tsx).
 *
 * Usage:
 *   MONGODB_URI=... DATABASE_URL=... npx tsx scripts/fix-migrated-partner-subscriptions.ts            (dry run)
 *   MONGODB_URI=... DATABASE_URL=... npx tsx scripts/fix-migrated-partner-subscriptions.ts --confirm  (real write)
 */
import { MongoClient, type Document } from "mongodb";
import { PrismaClient } from "@prisma/client";

const confirm = process.argv.includes("--confirm");
const prisma = new PrismaClient();
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Set MONGODB_URI before running this.");
  process.exit(1);
}

function pick(doc: Document, ...candidates: string[]): unknown {
  for (const key of candidates) {
    const v = doc[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}
function str(v: unknown, fallback = ""): string {
  return v === undefined || v === null ? fallback : String(v);
}

function resolveSubscription(sub: Document | null, vendorCreatedAt: Date | undefined) {
  const planKeyMap: Record<string, string> = { STARTER: "PLAN-BASIC", BASIC: "PLAN-PRO", PRO: "PLAN-PRO", ULTIMATE: "PLAN-ULTIMATE" };
  const signupAt = vendorCreatedAt ?? new Date();
  const trialStartAt = signupAt;
  const trialEndAt = new Date(signupAt);
  trialEndAt.setDate(trialEndAt.getDate() + 15);

  const currentPeriodEnd = sub ? pick(sub, "currentPeriodEnd") : undefined;
  const planKey = sub ? str(pick(sub, "planKey")) : "";
  const planId = planKey ? planKeyMap[planKey] ?? null : null;
  const validityDays = sub ? Number(pick(sub, "validityDays")) || 30 : 30;
  const billingCycle = validityDays >= 700 ? "TwoYearly" : "Yearly";

  if (currentPeriodEnd instanceof Date) {
    const active = currentPeriodEnd.getTime() > Date.now();
    return { subscriptionStatus: active ? "Active" : "PastDue", planId, billingCycle: planId ? billingCycle : null, trialStartAt, trialEndAt };
  }
  return { subscriptionStatus: "Trial", planId: null, billingCycle: null, trialStartAt, trialEndAt };
}

async function main() {
  const mongo = new MongoClient(MONGODB_URI!);
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB_NAME || "test");

  const partners = await prisma.partner.findMany({ where: { id: { startsWith: "SC" } } });
  console.log(`Checking ${partners.length} migrated partner(s) against real AN-CRM subscription data...\n`);

  for (const partner of partners) {
    const vendor = await db.collection("vendorprofiles").findOne({ email: partner.loginContact });
    if (!vendor) {
      console.log(`${partner.id} (${partner.businessName}): no matching AN-CRM vendor found by email "${partner.loginContact}" — skipped.`);
      continue;
    }
    const sub = await db.collection("vendorsubscriptions").findOne({ vendorId: vendor._id });
    const resolved = resolveSubscription(sub, vendor.createdAt instanceof Date ? vendor.createdAt : undefined);

    const changed =
      partner.subscriptionStatus !== resolved.subscriptionStatus ||
      partner.planId !== resolved.planId ||
      partner.billingCycle !== resolved.billingCycle;

    console.log(
      `${partner.id} (${partner.businessName}): stored=${partner.subscriptionStatus}/${partner.planId} -> real=${resolved.subscriptionStatus}/${resolved.planId}` +
        (sub ? ` (AN-CRM currentPeriodEnd: ${str(pick(sub, "currentPeriodEnd"))})` : " (no AN-CRM subscription doc)") +
        (changed ? "  ** WILL UPDATE **" : "  (already correct)")
    );

    if (confirm && changed) {
      await prisma.partner.update({
        where: { id: partner.id },
        data: {
          subscriptionStatus: resolved.subscriptionStatus,
          planId: resolved.planId,
          billingCycle: resolved.billingCycle,
        },
      });
    }
  }

  await mongo.close();
  await prisma.$disconnect();
  console.log(confirm ? "\nDone — updates applied." : "\nDRY RUN — nothing written. Re-run with --confirm to apply.");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exitCode = 1;
});
