/**
 * One-off seed: creates PartnerType rows for the 6 modules that got their
 * own dedicated Prisma tables this session --
 *
 *   subscriptions    (SubscriptionPlan/Subscriber)
 *   real-estate      (Property/Enquiry)
 *   rentals          (RentalAsset/RentalAgreement)
 *   logistics-fleet  (Vehicle/Driver/Trip)
 *   loyalty-rewards  (LoyaltyMember/PointsLedgerEntry)
 *   billing          (Invoice/Payment/CreditNote/Quotation/etc.)
 *
 * -- so each becomes its own standalone, self-serve signup-able business
 * type on /signup, per the user's explicit "1 module = 1 business" model.
 * Unique idPrefixes for nextPartnerId() (src/lib/partnerData.ts):
 *
 *   subscriptions   -> SUB
 *   real-estate     -> RLE  (picked over "REA"/"RE" -- "RLE" reads
 *                            unambiguously as "Real Estate" in ID strings
 *                            like RLE0001; "REA" could misread as a
 *                            truncated word, and 2-letter codes aren't
 *                            this session's convention)
 *   rentals         -> RNT
 *   logistics-fleet -> LOG
 *   loyalty-rewards -> LOY
 *   billing         -> BIL
 *
 * None of these collide with any prefix known from this session's earlier
 * scripts (SC/CC/FF/MFG/WSB/EVB/LGL/EDU/CLN/AMC/RPO/SPA) -- and this script
 * also live-checks every existing PartnerType row's idPrefix against this
 * list before writing anything, so a collision against ANY row already in
 * the database (not just the known ones) fails loudly instead of silently
 * interleaving two types' Partner ID sequences.
 *
 * defaultModules -- per this task's explicit "1 module = 1 business, no
 * bundling" directive (re-confirmed against the most recent seed script,
 * scripts/seed-more-vertical-partner-types.ts, which already dropped every
 * bundled add-on except "billing" itself):
 *
 *   - subscriptions, real-estate, rentals, logistics-fleet,
 *     loyalty-rewards: defaultModules = [own module slug] ONLY. No
 *     "billing" baseline bundled in either -- this task explicitly widens
 *     the "no bundling" standard one step further than the previous script
 *     (which still kept "billing" as a universal exception): a
 *     subscriptions-only or real-estate-only signup gets exactly that one
 *     module and nothing else, full stop. If an operator later wants
 *     invoicing on top, that's an explicit Designer/module-enablement
 *     action, not a signup-time default.
 *   - billing: defaultModules = ["billing"] ONLY -- this IS the module
 *     being made standalone here, so it is trivially its own default with
 *     nothing else bundled in.
 *
 * Why Billing gets its own PartnerType at all (this was the one open
 * architectural question in this task): Billing is used as the invoicing
 * backend by nearly every OTHER business type here -- e.g. src/lib/... 's
 * defaultModules for "pos", "wholesale-b2b", "clinic", "amc-field-service",
 * "restaurant-pos", "salon-spa" etc. already universally include "billing"
 * as their baseline, and restaurant-pos's settleBillAction() /
 * PosCheckout's completeSaleAction() both call
 * createBusinessRecord(partnerId, "billing", ...) directly -- Billing is
 * load-bearing shared infrastructure across the whole platform. But per
 * the user's literal "every module = its own business" directive, a
 * business that is PURELY an invoicing/billing service -- e.g. a
 * freelance consultant, agency, or small shop that only wants to issue
 * GST-compliant invoices/quotations/credit-notes with nothing else (no
 * POS, no inventory, no service jobs) -- is a real, valid standalone
 * signup type, distinct from every other type that merely *consumes*
 * Billing as a dependency. Giving it its own PartnerType does not remove
 * or change Billing's role as universal invoicing infra for other module
 * types (their defaultModules already include "billing" independently);
 * it only adds a new front door for someone whose entire business IS
 * billing.
 *
 * Billing module capabilities (read from
 * src/app/partner/[partnerId]/billing/* this session -- real, already
 * built pages/subfolders, not aspirational): invoices (list/new/detail),
 * payments, credit/debit notes, quotations, delivery challans, proforma
 * invoices, expenses, recurring invoices (src/app/api/cron/
 * billing-recurring-invoices), a contacts/party book, and reports
 * (contact statement / ledger, profit & loss) -- i.e. a full GST invoicing
 * suite: quote -> invoice -> payment -> credit note, with recurring
 * billing and P&L/statement reporting on top.
 *
 * status: "Active", requiresApproval: false -- open self-serve signup,
 * matching every other new-vertical type seeded this session.
 *
 * planTierByPage/assignableRoleIds/planIds left at their empty-default
 * shape ({}/[]/[]) -- same confirmed-safe shape every other new-vertical
 * seed script in this session used.
 *
 * Idempotent: every write is an upsert keyed by id (the PartnerType slug
 * == the module slug), safe to re-run.
 *
 * Does NOT run any prisma migrate/db push -- PartnerType is an existing
 * table (see prisma/schema.prisma); this only writes rows into it. This
 * script is NOT executed as part of this task -- it is left for the user
 * to run themselves per CLAUDE.md's database-safety rules (no
 * schema/data-mutating command is to be run against the shared database
 * from an agent session).
 *
 * IMPORTANT -- run this ONLY after the concurrent module-conversion work
 * (Subscriptions/Real-Estate/Rentals/Logistics-Fleet/Loyalty-Rewards/
 * Billing -- each getting dedicated Prisma tables in parallel this
 * session) has actually finished, merged, and been verified working. A
 * PartnerType going live (self-serve signup-able) before its module's real
 * pages/tables exist would let someone sign up into a half-built
 * experience.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-final-vertical-partner-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_VERTICAL_TYPES = [
  {
    id: "subscriptions",
    description:
      "Subscriptions / Membership: recurring membership plans, subscriber sign-up and renewal tracking, and check-in for gyms, coaching, and clubs.",
    idPrefix: "SUB",
  },
  {
    id: "real-estate",
    description:
      "Real Estate: property/listing catalog, buyer/renter enquiry tracking, site-visit scheduling, and agreement records.",
    idPrefix: "RLE",
  },
  {
    id: "rentals",
    description:
      "Rentals / Booking: equipment, venue, or asset inventory with booking calendar and rental agreement tracking.",
    idPrefix: "RNT",
  },
  {
    id: "logistics-fleet",
    description:
      "Logistics / Fleet: vehicle and driver roster management, trip assignment, and delivery/trip tracking.",
    idPrefix: "LOG",
  },
  {
    id: "loyalty-rewards",
    description:
      "Loyalty & Rewards: member enrollment, points/cashback ledger, and redemption tracking.",
    idPrefix: "LOY",
  },
  {
    id: "billing",
    description:
      "Billing: standalone GST invoicing suite -- quotations, delivery challans, and proforma invoices through to invoices, payments, and credit/debit notes, plus recurring invoices, a contacts/party book, and statement & profit-and-loss reporting. For businesses whose entire operation is issuing and collecting on invoices, with no POS, inventory, or service-job workflow attached.",
    idPrefix: "BIL",
  },
] as const;

async function main() {
  // Live collision check against EVERY existing PartnerType row (not just
  // the known SC/CC/FF/MFG/WSB/EVB/LGL/EDU/CLN/AMC/RPO/SPA prefixes from
  // earlier scripts this session), per this task's instruction to verify
  // live rather than trust a stale list.
  const existing = await prisma.partnerType.findMany({
    select: { id: true, idPrefix: true, status: true },
  });
  const newPrefixes = new Set(NEW_VERTICAL_TYPES.map((t) => t.idPrefix));
  const collisions = existing.filter(
    (row) =>
      newPrefixes.has(row.idPrefix as (typeof NEW_VERTICAL_TYPES)[number]["idPrefix"]) &&
      !NEW_VERTICAL_TYPES.some((t) => t.id === row.id)
  );
  if (collisions.length > 0) {
    throw new Error(
      `Refusing to seed: idPrefix collision with existing PartnerType row(s): ${collisions
        .map((c) => `${c.id} (idPrefix "${c.idPrefix}", status ${c.status})`)
        .join(", ")}`
    );
  }
  console.log(
    `Collision check passed: no existing PartnerType row uses SUB/RLE/RNT/LOG/LOY/BIL (checked ${existing.length} existing row(s)).`
  );

  for (const type of NEW_VERTICAL_TYPES) {
    const defaultModules = [type.id];
    await prisma.partnerType.upsert({
      where: { id: type.id },
      create: {
        id: type.id,
        description: type.description,
        defaultModules,
        assignableRoleIds: [],
        planTierByPage: {},
        planIds: [],
        idPrefix: type.idPrefix,
        requiresApproval: false,
        status: "Active",
      },
      update: {
        description: type.description,
        defaultModules,
        idPrefix: type.idPrefix,
        requiresApproval: false,
        status: "Active",
      },
    });
    console.log(
      `PartnerType upserted: "${type.id}" (idPrefix "${type.idPrefix}", Active, defaultModules: ${defaultModules.join(", ")})`
    );
  }

  console.log(
    "\nDone. Reload /signup -- Subscriptions, Real Estate, Rentals, Logistics/Fleet, Loyalty & Rewards, and Billing should now be selectable as their own standalone business types."
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
