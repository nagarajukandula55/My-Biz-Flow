/**
 * One-off (re-runnable) correction for the 8 real partners migrated from
 * AN-CRM. Two rounds of the same underlying mistake, both fixed here:
 *  1. The very first migration run left everyone on a blanket "Active +
 *     PLAN-ULTIMATE + Yearly" default.
 *  2. A first correction pass (this script, run once already) then read
 *     VendorSubscription.currentPeriodEnd as if it meant "genuinely paid" —
 *     but AN-CRM's own free-trial grant creates the exact same shape.
 *     Confirmed directly: ALL 8 vendors have zero PAID
 *     VendorBillingInvoice records. See resolveSubscription()'s own
 *     comment for the real gate now used (mirroring AN-CRM's own
 *     planAccess.ts).
 * Safe to re-run — only updates a partner whose stored values actually
 * differ from the freshly-resolved real values.
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

/**
 * The presence of a VendorSubscription row with a future currentPeriodEnd
 * does NOT mean the vendor paid — AN-CRM's own free-trial grant creates
 * exactly the same shape (planKey: "ULTIMATE", a currentPeriodEnd 15 days
 * out) as a real purchase would. Confirmed directly against production:
 * ALL 8 real migrated vendors have ZERO documents in vendorbillinginvoices
 * with status "PAID" — every one of them is genuinely still on the free
 * trial, never a real payment, regardless of what currentPeriodEnd says.
 * AN-CRM's own real gate for "did they actually pay" is exactly this check
 * (see src/core/pricing/planAccess.ts's getVendorTelegramTier/
 * vendorHasCustomerDatabaseAccess, both of which check
 * VendorBillingInvoice.exists({ vendorId, status: "PAID" }) rather than
 * trusting VendorSubscription alone) — mirrored here.
 *
 * Trial partners keep PLAN-ULTIMATE so they retain full feature access
 * during the trial (AN-CRM's own trial is full-featured, not limited), but
 * subscriptionStatus stays "Trial" so the Subscription page shows a real
 * day-countdown and keeps the "choose a plan to convert" purchase UI
 * visible throughout — a partner can purchase at any time during trial,
 * not just after it lapses.
 */
function resolveSubscription(sub: Document | null, hasPaidInvoice: boolean, vendorCreatedAt: Date | undefined) {
  const planKeyMap: Record<string, string> = { STARTER: "PLAN-BASIC", BASIC: "PLAN-PRO", PRO: "PLAN-PRO", ULTIMATE: "PLAN-ULTIMATE" };
  const signupAt = vendorCreatedAt ?? new Date();
  const currentPeriodEnd = sub ? pick(sub, "currentPeriodEnd") : undefined;
  const planKey = sub ? str(pick(sub, "planKey")) : "";
  const planId = planKey ? planKeyMap[planKey] ?? null : null;
  const validityDays = sub ? Number(pick(sub, "validityDays")) || 30 : 30;
  const billingCycle = validityDays >= 700 ? "TwoYearly" : "Yearly";

  // Trial window: the same currentPeriodEnd the free-trial grant set, since
  // that IS the real trial-end date here (falls back to signup + 15 days if
  // there's no VendorSubscription row at all yet).
  const trialStartAt = signupAt;
  const trialEndAt = currentPeriodEnd instanceof Date ? currentPeriodEnd : new Date(signupAt.getTime() + 15 * 24 * 60 * 60 * 1000);

  if (!hasPaidInvoice) {
    // Never paid -- always Trial, whether or not the trial window has
    // lapsed (the Subscription page already derives "Trial Expired" display
    // state from trialEndAt being in the past; the stored status stays
    // "Trial" either way, matching how it already handles a fresh signup).
    return { subscriptionStatus: "Trial", planId, billingCycle: null, trialStartAt, trialEndAt };
  }

  if (currentPeriodEnd instanceof Date) {
    const active = currentPeriodEnd.getTime() > Date.now();
    return { subscriptionStatus: active ? "Active" : "PastDue", planId, billingCycle: planId ? billingCycle : null, trialStartAt, trialEndAt };
  }
  return { subscriptionStatus: "Trial", planId, billingCycle: null, trialStartAt, trialEndAt };
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
    const hasPaidInvoice = (await db.collection("vendorbillinginvoices").countDocuments({ vendorId: vendor._id, status: "PAID" })) > 0;
    const resolved = resolveSubscription(sub, hasPaidInvoice, vendor.createdAt instanceof Date ? vendor.createdAt : undefined);

    const changed =
      partner.subscriptionStatus !== resolved.subscriptionStatus ||
      partner.planId !== resolved.planId ||
      partner.billingCycle !== resolved.billingCycle ||
      partner.trialEndAt?.getTime() !== resolved.trialEndAt.getTime();

    console.log(
      `${partner.id} (${partner.businessName}): stored=${partner.subscriptionStatus}/${partner.planId} -> real=${resolved.subscriptionStatus}/${resolved.planId}` +
        ` (hasPaidInvoice: ${hasPaidInvoice}, trialEndAt: ${resolved.trialEndAt.toISOString()})` +
        (changed ? "  ** WILL UPDATE **" : "  (already correct)")
    );

    if (confirm && changed) {
      await prisma.partner.update({
        where: { id: partner.id },
        data: {
          subscriptionStatus: resolved.subscriptionStatus,
          planId: resolved.planId,
          billingCycle: resolved.billingCycle,
          trialStartAt: resolved.trialStartAt,
          trialEndAt: resolved.trialEndAt,
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
