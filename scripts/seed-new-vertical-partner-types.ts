/**
 * One-off seed: creates the 5 new vertical PartnerType rows that came out of
 * this session's Manufacturing / Wholesale B2B / Event Booking / Legal /
 * Education module builds (all `taxonomy: "vertical"` in
 * src/lib/designer/modules.ts) so they become real signup-able business
 * types, each with its own unique idPrefix for nextPartnerId()
 * (src/lib/partnerData.ts) to count against independently:
 *
 *   manufacturing  -> MFG
 *   wholesale-b2b  -> WSB
 *   event-booking  -> EVB
 *   legal          -> LGL
 *   education      -> EDU
 *
 * None of these collide with the 3 existing prefixes (service-centre "SC",
 * telecalling "CC", field-force "FF") or the "VND" fallback default -- and
 * this script also live-checks every existing PartnerType row's idPrefix
 * against this list before writing anything, so a prefix collision against
 * ANY row already in the database (not just the 3 known ones) fails loudly
 * instead of silently interleaving two types' Partner ID sequences.
 *
 * defaultModules per type = [own vertical slug, "billing", "hrms",
 * "marketplace", "accounting"] -- "billing" is the same baseline every
 * vertical type gets (see scripts/seed-launch-data.ts's service-centre
 * comment: invoicing/billing is a cross-cutting dependency, not optional),
 * and hrms/marketplace/accounting are the 3 cross-cutting add-on modules
 * built this session, bundled in by default per this task's instructions so
 * a partner signing up as any of these 5 types gets a fully-equipped account
 * out of the box (staff/payroll, multi-partner aggregation, and real
 * double-entry books) without a separate upsell step.
 *
 * status: "Active", requiresApproval: false -- open self-serve signup,
 * matching service-centre/telecalling's pattern (not field-force's gated
 * one), since nothing about these 5 types needs a manual approval gate.
 *
 * planTierByPage/assignableRoleIds/planIds intentionally left at their
 * empty-default shape ({}/[]/[]) -- confirmed against both existing seed
 * scripts that this is a safe, working shape (telecalling ships with the
 * exact same {}/[]/[] and is a live, working self-serve type; only
 * service-centre populates planTierByPage, and only because
 * DEFAULT_PAGE_TIERS already existed for it specifically -- no such map
 * exists yet for any of these 5 new modules). planIds is left empty (no
 * Plan rows are created by this script) since this task did not ask for
 * pricing-plan seeding for these 5 types; a Super Admin can bundle real
 * Plans in later via /admin/partner-types without touching this script.
 *
 * Idempotent: every write is an upsert keyed by id (the PartnerType slug),
 * safe to re-run.
 *
 * Does NOT run any prisma migrate/db push -- PartnerType is an existing
 * table (see prisma/schema.prisma), this only writes rows into it.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-new-vertical-partner-types.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const NEW_VERTICAL_TYPES = [
  {
    id: "manufacturing",
    description:
      "Manufacturing / Production shops: bill of materials, production work orders, and raw material consumption tracking.",
    idPrefix: "MFG",
  },
  {
    id: "wholesale-b2b",
    description:
      "Wholesale / Distributor B2B: bulk pricing tiers, dealer/distributor accounts, and credit terms for B2B order management.",
    idPrefix: "WSB",
  },
  {
    id: "event-booking",
    description:
      "Event / Venue Booking: event scheduling, banquet hall/venue bookings, catering and resource allocation.",
    idPrefix: "EVB",
  },
  {
    id: "legal",
    description:
      "Legal / Case Management: client matters, billable hours, and document tracking for law firms and legal practices.",
    idPrefix: "LGL",
  },
  {
    id: "education",
    description:
      "Education / Coaching: student enrollment, batches, courses, fees, and attendance tracking for schools and coaching centres.",
    idPrefix: "EDU",
  },
] as const;

async function main() {
  // Live collision check against EVERY existing PartnerType row (not just
  // the 3 known ones), per this task's instruction to double-check nothing
  // else already uses MFG/WSB/EVB/LGL/EDU before writing.
  const existing = await prisma.partnerType.findMany({
    select: { id: true, idPrefix: true, status: true },
  });
  const newPrefixes = new Set(NEW_VERTICAL_TYPES.map((t) => t.idPrefix));
  const collisions = existing.filter(
    (row) => newPrefixes.has(row.idPrefix as (typeof NEW_VERTICAL_TYPES)[number]["idPrefix"]) &&
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
    `Collision check passed: no existing PartnerType row uses MFG/WSB/EVB/LGL/EDU (checked ${existing.length} existing row(s)).`
  );

  for (const type of NEW_VERTICAL_TYPES) {
    const defaultModules = [type.id, "billing", "hrms", "marketplace", "accounting"];
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

  console.log("\nDone. Reload /signup -- Manufacturing, Wholesale B2B, Event Booking, Legal, and Education should now be selectable.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
