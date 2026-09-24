/**
 * One-off launch seed: creates the Plan rows and the Service Centre
 * PartnerType row that a fresh production database has none of (the
 * signup page reads real `PartnerType`/`Plan` rows — an empty DB means
 * "No business types are open for signup yet").
 *
 * Idempotent: every write is an upsert keyed by id, safe to re-run.
 *
 * Prices below are AN-CRM's real, currently-live Service Centre pricing
 * (standard/post-launch `monthlyPriceINR`, not its temporary
 * `launchPriceINR` introductory rate) — see AN-CRM's
 * src/core/pricing/plans.ts, the single source of truth that app's own
 * /pricing page renders from: Starter ₹799/mo, Pro ₹1,199/mo (AN-CRM's
 * internal plan key for this tier stays "BASIC" — same tier, different
 * label), Ultimate ₹2,499/mo. Module bundles/seat limits below are this
 * app's own approximation of AN-CRM's real per-tier gating (Starter has
 * no inventory/catalog at all — workorder + invoicing only; Ultimate is
 * the only tier with unlimited multi-location), not AN-CRM's own module
 * vocabulary, since My Biz Flow's module system doesn't share AN-CRM's.
 * My Biz Flow has no per-period (monthly/yearly/2-yearly) pricing table
 * or launch-pricing-cutover concept on the `Plan` model yet — only a
 * single flat price + billingCycle per plan — so AN-CRM's discounted
 * yearly/2-yearly framing and its temporary launch price are not carried
 * over here; this seeds the real standard monthly rate only.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-launch-data.ts
 */
import { PrismaClient } from "@prisma/client";
import { DEFAULT_PAGE_TIERS } from "../src/lib/designer/pageTiers";

const prisma = new PrismaClient();

// The pageId -> tier split is no longer a literal here. It lives in
// src/lib/designer/pageTiers.ts so that the RUNTIME enforcement path
// (assertPageTierAccess / getPageTierAccess in src/lib/tenant.ts) and this
// seed read the exact same map — when it was only a literal in this script,
// the split existed solely as a database row and nothing in the app could
// fall back to it.
const SERVICE_CENTRE_PAGES = DEFAULT_PAGE_TIERS;

// Exported (not just a local literal in main()) so scripts/backfill-plan-prices.ts
// can correct any already-stored Plan row (wrong price and/or a stale display
// name like "Basic" left over from before this seed's naming convention)
// against these exact same values, instead of re-typing the same
// name/price pairs a second time and risking the two drifting apart.
export const LAUNCH_PLANS = [
  { id: "PLAN-BASIC", name: "Starter", price: 799, billingCycle: "monthly", includedModuleSlugs: ["service-centre"], maxUsers: 1, maxLocations: 1, isPublic: true },
  { id: "PLAN-PRO", name: "Pro", price: 1199, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory", "billing"], maxUsers: 5, maxLocations: 1, isPublic: true },
  { id: "PLAN-ULTIMATE", name: "Ultimate", price: 2499, billingCycle: "monthly", includedModuleSlugs: ["service-centre", "inventory", "billing", "accounting-gst"], maxUsers: 9999, maxLocations: 9999, isPublic: true },
];

// PLACEHOLDER PRICING — mirrored from Service Centre's launch prices
// (₹799/₹1,199/₹2,499) purely as reasonable placeholders so Telecalling
// isn't priced at ₹0. This is NOT a considered pricing decision — the
// platform owner should revisit these numbers before or shortly after
// this goes live. Telecalling is a single module (no Inventory/Billing/
// GST module to bundle in progressively the way Service Centre does — see
// src/app/partner/[partnerId]/telecalling/**, which has no hard
// dependency on any other module), so all three tiers include just
// ["telecalling"]; the feature differences between tiers (territory
// auto-assignment, unlimited agents, etc. — see MODULE_TIER_FEATURES.
// telecalling in src/lib/designer/moduleTiers.ts) are enforced elsewhere,
// not via module bundling.
export const TELECALLING_LAUNCH_PLANS = [
  { id: "PLAN-TELECALLING-BASIC", name: "Starter", price: 799, billingCycle: "monthly", includedModuleSlugs: ["telecalling"], maxUsers: 2, maxLocations: 1, isPublic: true },
  { id: "PLAN-TELECALLING-PRO", name: "Pro", price: 1199, billingCycle: "monthly", includedModuleSlugs: ["telecalling"], maxUsers: 10, maxLocations: 1, isPublic: true },
  { id: "PLAN-TELECALLING-ULTIMATE", name: "Ultimate", price: 2499, billingCycle: "monthly", includedModuleSlugs: ["telecalling"], maxUsers: 9999, maxLocations: 9999, isPublic: true },
];

// Exported so src/app/api/admin/seed-launch-data/route.ts (same
// shared-secret remote-trigger pattern as api/admin/seed-demo-partner) can
// call this against the deployed DB when the operator's own machine can't
// reach it directly, without spawning a child process.
export async function seedLaunchData() {
  // Plan ids kept as PLAN-BASIC/PLAN-PRO/PLAN-ULTIMATE (matching this
  // app's basic/pro/ultimate PlanTier keys) even though the bottom tier's
  // real AN-CRM name is "Starter" — same reasoning AN-CRM itself used to
  // keep its own "BASIC" internal key while renaming the displayed plan
  // to "Pro": avoids a data migration on any PartnerType/subscription row
  // already referencing this id.
  // Plan.price is plain RUPEES, not paise — every consumer treats it that
  // way directly (no /100 anywhere): /pricing and /subscribe render
  // `₹${plan.price}`, and computePartnerDueAmount's result is only
  // multiplied by 100 once, at the very end, when handing it to Razorpay
  // (see api/razorpay/create-order/route.ts's `due.amount * 100`). An
  // earlier version of this seed stored these ×100 (79900/119900/249900),
  // which rendered as ₹79,900/₹1,19,900/₹2,49,900 on every plan-priced page
  // and would have charged 100x too much through Razorpay — fixed to the
  // real rupee values.
  const plans = LAUNCH_PLANS;

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
    console.log(`Plan upserted: ${plan.id} (${plan.name}, ₹${plan.price}/mo)`);
  }

  await prisma.partnerType.upsert({
    where: { id: "service-centre" },
    create: {
      id: "service-centre",
      description: "Repair/service shops running workorders, inventory, and GST billing.",
      // "billing" is a required dependency, not an optional add-on: closing a
      // chargeable workorder (createInvoiceFromWorkorderAction in
      // service-centre/[recordId]/actions.ts) creates a real Billing invoice
      // directly via createBusinessRecord(partnerId, "billing", ...), and the
      // Service Centre invoice page reads that same Billing data. Without
      // "billing" here, getVisibleModuleSlugs() never shows Sales
      // Invoice/Credit Note/Debit Note/Quotation/Delivery Challan/Proforma in
      // the sidebar even though the partner is already generating invoices.
      defaultModules: ["service-centre", "inventory", "billing"],
      assignableRoleIds: [],
      planTierByPage: SERVICE_CENTRE_PAGES,
      planIds: plans.map((p) => p.id),
      idPrefix: "SC",
      requiresApproval: false,
      status: "Active",
    },
    update: {
      defaultModules: ["service-centre", "inventory", "billing"],
      planTierByPage: SERVICE_CENTRE_PAGES,
      planIds: plans.map((p) => p.id),
      idPrefix: "SC",
      status: "Active",
    },
  });
  console.log('PartnerType upserted: "service-centre" (idPrefix "SC", Active, open for signup)');

  // Telecalling: full module code already exists (src/app/partner/[partnerId]/telecalling/**)
  // and src/lib/designer/moduleTiers.ts already has complete basic/pro/ultimate
  // feature bullets for it, but until now no PartnerType/Plan rows existed so
  // it was never actually choosable on /signup. idPrefix "CC" (not "TC") to
  // match what src/app/solutions/telecalling/page.tsx already documents in
  // its own registerPage() explanation ('PartnerType.id "telecalling",
  // idPrefix "CC"') — written ahead of this seed change in an earlier
  // session. Doesn't collide with Service Centre's "SC" or Field Force's "FF"
  // (see scripts/activateFieldForce.ts) or the "VND" fallback default.
  for (const plan of TELECALLING_LAUNCH_PLANS) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
    console.log(`Plan upserted: ${plan.id} (${plan.name}, ₹${plan.price}/mo)`);
  }

  await prisma.partnerType.upsert({
    where: { id: "telecalling" },
    create: {
      id: "telecalling",
      description: "Bulk-upload a contact list, assign it to telecaller agents, click-to-call from the app, and trigger SMS/WhatsApp template messages per contact.",
      // Standalone — telecalling has no hard dependency on Billing or any
      // other module (unlike Service Centre's invoice-on-close flow), so
      // nothing else is bundled by default.
      defaultModules: ["telecalling"],
      assignableRoleIds: [],
      // No telecalling-specific per-page tier map exists yet (DEFAULT_PAGE_TIERS
      // is Service Centre's own map) — same {} pattern activateFieldForce.ts
      // uses for field-force until one is written.
      planTierByPage: {},
      planIds: TELECALLING_LAUNCH_PLANS.map((p) => p.id),
      idPrefix: "CC",
      requiresApproval: false,
      status: "Active",
    },
    update: {
      defaultModules: ["telecalling"],
      planTierByPage: {},
      planIds: TELECALLING_LAUNCH_PLANS.map((p) => p.id),
      idPrefix: "CC",
      status: "Active",
    },
  });
  console.log('PartnerType upserted: "telecalling" (idPrefix "CC", Active, open for signup)');

  // Field Force is NOT touched here — it's already fully handled by its own
  // idempotent script, scripts/activateFieldForce.ts, which sets up a single
  // free Plan (commission-based, not subscription) and marks the
  // "field-force" PartnerType Active. Run that script separately if it
  // hasn't been run against this database yet.

  console.log("\nDone. Reload /signup — Service Centre and Telecalling should now be selectable.");
}

// Only run as a CLI script when invoked directly (`npx tsx scripts/seed-launch-data.ts`) —
// not when imported by the API route below, which manages the shared
// `prisma` client's lifecycle itself.
if (require.main === module) {
  seedLaunchData()
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
