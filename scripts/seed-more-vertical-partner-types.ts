/**
 * One-off seed: creates PartnerType rows for the 4 modules that got their
 * own dedicated Prisma tables this session --
 *
 *   clinic            (Patient/Appointment/Prescription)
 *   amc-field-service (AmcContract/ServiceVisit)
 *   restaurant-pos    (RestaurantTable/RestaurantOrder)
 *   salon-spa         (SalonService/SalonAppointment)
 *
 * -- so each becomes its own standalone, self-serve signup-able business
 * type on /signup, per the user's explicit "1 module = 1 business" model:
 * every module stands on its own as an independently selectable business
 * type, never bundled in as an add-on under someone else's type. Each gets
 * its own unique idPrefix for nextPartnerId() (src/lib/partnerData.ts) to
 * count against independently:
 *
 *   clinic            -> CLN
 *   amc-field-service -> AMC
 *   restaurant-pos    -> RPO  (picked over "RES" -- "RES" reads ambiguously,
 *                              e.g. could be misread as "reservation"/"reset"
 *                              in ID strings like RES0001; "RPO" reads
 *                              unambiguously as Restaurant P.O.S.)
 *   salon-spa         -> SPA
 *
 * None of these collide with any prefix known from this session's earlier
 * scripts (SC/CC/FF/MFG/WSB/EVB/LGL/EDU/POS) -- and this script also
 * live-checks every existing PartnerType row's idPrefix against this list
 * before writing anything, so a collision against ANY row already in the
 * database (not just the known ones) fails loudly instead of silently
 * interleaving two types' Partner ID sequences.
 *
 * defaultModules per type = [own module slug, "billing"] ONLY -- per this
 * task's explicit "1 module = 1 business, no bundling" directive, these 4
 * do NOT get hrms/marketplace/accounting/inventory bundled in by default
 * the way the 5 new-vertical types did earlier this session. "billing" is
 * kept as the one universal exception, same baseline every vertical type
 * in this session has gotten -- it's a near-universal need (invoicing),
 * not a vertical-specific add-on:
 *   - clinic: appointments/consultations need to be billable to the
 *     patient (consultation billing is literally part of this module's own
 *     description in src/lib/designer/modules.ts).
 *   - amc-field-service: AMC contract renewals and service visits are
 *     billable events.
 *   - restaurant-pos: settleBillAction() in
 *     src/app/partner/[partnerId]/restaurant-pos/actions.ts already calls
 *     createBusinessRecord(partnerId, "billing", ...) directly to create a
 *     real Billing invoice on every table settle (with split-bill support)
 *     -- Billing is load-bearing infrastructure for this module exactly
 *     like it is for the main POS module, not optional.
 *   - salon-spa: salon appointments are billable services.
 *
 * Restaurant POS + inventory -- checked explicitly per this task's
 * instruction (same standard as why the main "pos" type bundles
 * inventory): read restaurant-pos's actual actions.ts
 * (addItemToOrderAction, sendToKitchenAction, settleBillAction, etc.) and
 * its table-order page -- unlike PosCheckout's completeSaleAction, NONE of
 * restaurant-pos's order/settle flow reads or writes any
 * "inventory-stock" BusinessRecord; menu items come from a static
 * restaurantMenuItems catalog (src/lib/sample-data/restaurant-pos.ts), not
 * live stock records, so there is no functional dependency on the
 * Inventory module the way the main POS module's checkout has. Inventory
 * is deliberately NOT included here -- a restaurant-pos-only signup works
 * correctly with zero inventory records, matching the "no bundling"
 * directive rather than the POS exception.
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
 * Usage: DATABASE_URL=... npx tsx scripts/seed-more-vertical-partner-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_VERTICAL_TYPES = [
  {
    id: "clinic",
    description:
      "Clinic / Patient Care: patient records, appointment scheduling, prescriptions, and consultation billing for clinics and small practices.",
    idPrefix: "CLN",
  },
  {
    id: "amc-field-service",
    description:
      "AMC / Field Service: recurring annual maintenance contracts, technician dispatch, service visit logging, and contract renewal tracking.",
    idPrefix: "AMC",
  },
  {
    id: "restaurant-pos",
    description:
      "Restaurant POS: table floor management, KOT (kitchen order ticket) workflow, per-table order carts, and bill settlement with split-bill support.",
    idPrefix: "RPO",
  },
  {
    id: "salon-spa",
    description:
      "Salon & Spa: beauty/personal-care service menu, stylist assignment, and appointment scheduling and booking.",
    idPrefix: "SPA",
  },
] as const;

async function main() {
  // Live collision check against EVERY existing PartnerType row (not just
  // the known SC/CC/FF/MFG/WSB/EVB/LGL/EDU/POS prefixes from earlier
  // scripts this session), per this task's instruction to verify live
  // rather than trust a stale list.
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
    `Collision check passed: no existing PartnerType row uses CLN/AMC/RPO/SPA (checked ${existing.length} existing row(s)).`
  );

  for (const type of NEW_VERTICAL_TYPES) {
    const defaultModules = [type.id, "billing"];
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
    "\nDone. Reload /signup -- Clinic, AMC/Field Service, Restaurant POS, and Salon & Spa should now be selectable as their own standalone business types."
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
