/**
 * One-off backfill: for every PartnerType whose own vertical module already
 * creates real Billing invoices directly via
 * createBusinessRecord(partnerId, "billing", {...}) — i.e. Billing is a
 * functional dependency of that vertical, not an optional module a partner
 * would "request access" to — this:
 *
 *   1. Adds "billing" to that PartnerType's `defaultModules` if missing, so
 *      brand-new signups of that type get it automatically going forward
 *      (issueDefaultModuleAccessKeys in src/lib/partnerData.ts reads
 *      defaultModules at signup time).
 *   2. Issues an active ModuleAccessKey for "billing" to every EXISTING
 *      partner of that type that doesn't already have one, matching what
 *      issueDefaultModuleAccessKeys does for a new signup — otherwise
 *      getVisibleModuleSlugs() (src/lib/designer/entitlements.ts) keeps
 *      hiding Sales Invoice/Credit Note/Debit Note/Quotation/Delivery
 *      Challan/Proforma from the sidebar for partners who are already
 *      generating real Billing invoices through their own module.
 *
 * Root cause: Service Centre (and the other verticals listed below) call
 * createBusinessRecord(partnerId, "billing", ...) directly from their own
 * lifecycle actions (e.g. createInvoiceFromWorkorderAction in
 * service-centre/[recordId]/actions.ts) to record an invoice, bypassing the
 * normal "partner opts into the billing module" path entirely. The nav
 * config for Sales Invoice/Credit Note/etc. (src/lib/designer/modules.ts,
 * slug "billing") already exists and was never the issue — the partner
 * simply never held the module in the first place.
 *
 * VERTICALS covers every module found (by grep) calling
 * createBusinessRecord(partnerId, "billing", ...) directly, the same
 * pattern as Service Centre: service-centre, education, clinic,
 * wholesale-b2b, event-booking, legal, pos, restaurant-pos, salon-spa,
 * subscriptions. If a PartnerType's defaultModules includes any of these
 * but not "billing", it has the same gap.
 *
 * Idempotent: safe to re-run — PartnerType update only adds the missing
 * slug, and ModuleAccessKey issuance upserts (same as backfill-access-keys.ts).
 *
 * Usage: DATABASE_URL=... npx tsx scripts/backfill-billing-module-for-invoicing-verticals.ts
 *
 * NOT run against production by the agent that wrote this — no live
 * DATABASE_URL was available in that sandbox. Run this once, by someone
 * with real DB access, before relying on the fix for EXISTING partners.
 * (New signups of an affected PartnerType are already fixed going forward
 * by the defaultModules change in scripts/seed-launch-data.ts and/or by
 * fixing the affected PartnerType row directly in /admin/partner-types.)
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const VERTICALS_THAT_CREATE_BILLING_RECORDS = [
  "service-centre",
  "education",
  "clinic",
  "wholesale-b2b",
  "event-booking",
  "legal",
  "pos",
  "restaurant-pos",
  "salon-spa",
  "subscriptions",
];

function generateKey(moduleSlug: string): string {
  const suffix = randomBytes(6).toString("hex").toUpperCase();
  return `MBF-${moduleSlug.toUpperCase()}-${suffix}`;
}

async function main() {
  const partnerTypes = await prisma.partnerType.findMany();
  // Every type that depends on billing (whether its defaultModules already
  // included "billing" from an earlier run/fix, or needs fixing now) — NOT
  // just the ones fixed in THIS run. A partner signed up before defaultModules
  // was corrected still needs the key issued even though the type itself no
  // longer needs updating; the previous version of this script only looked
  // at types it fixed just now, so a type fixed by an earlier/separate script
  // run (e.g. the Plan-price backfill also upserts PartnerType.defaultModules)
  // silently skipped issuing keys to that type's already-existing partners.
  const dependentTypeIds: string[] = [];

  for (const pt of partnerTypes) {
    const modules = (pt.defaultModules as string[] | null) ?? [];
    const dependsOnBilling = modules.some((m) => VERTICALS_THAT_CREATE_BILLING_RECORDS.includes(m));
    if (!dependsOnBilling) continue;

    if (!modules.includes("billing")) {
      const updatedModules = [...modules, "billing"];
      await prisma.partnerType.update({
        where: { id: pt.id },
        data: { defaultModules: updatedModules },
      });
      console.log(`PartnerType "${pt.id}": added "billing" to defaultModules -> ${JSON.stringify(updatedModules)}`);
    }
    dependentTypeIds.push(pt.id);
  }

  if (dependentTypeIds.length === 0) {
    console.log('No PartnerType depends on billing via a vertical module. Nothing to backfill.');
    return;
  }

  const partners = await prisma.partner.findMany({ where: { partnerTypeId: { in: dependentTypeIds } } });
  let issued = 0;

  for (const partner of partners) {
    const existing = await prisma.moduleAccessKey.findUnique({
      where: { partnerId_moduleSlug: { partnerId: partner.id, moduleSlug: "billing" } },
    });
    if (existing?.status === "active") continue;
    await prisma.moduleAccessKey.upsert({
      where: { partnerId_moduleSlug: { partnerId: partner.id, moduleSlug: "billing" } },
      create: {
        partnerId: partner.id,
        moduleSlug: "billing",
        key: generateKey("billing"),
        status: "active",
        note: "Backfilled: billing is a functional dependency of this partner's vertical module",
      },
      update: {
        key: generateKey("billing"),
        status: "active",
        revokedAt: null,
        note: "Backfilled: billing is a functional dependency of this partner's vertical module",
      },
    });
    issued += 1;
    console.log(`Issued: ${partner.id} (type ${partner.partnerTypeId}) -> billing`);
  }

  console.log(
    `\nDone. PartnerType(s) depending on billing: ${dependentTypeIds.join(", ")}. ${issued} ModuleAccessKey("billing") issued/reactivated across ${partners.length} partner(s) of those type(s).`,
  );
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
