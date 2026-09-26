/**
 * One-off seed: creates the "pos" PartnerType row so POS (src/lib/designer/modules.ts's
 * `{ slug: "pos", label: "POS", taxonomy: "vertical" }`) becomes its own
 * standalone, self-serve signup-able business type on /signup, with its own
 * unique idPrefix for nextPartnerId() (src/lib/partnerData.ts) to count
 * against independently.
 *
 * POS already has real, dedicated Prisma tables — PosAccount, PosStaff,
 * PosTillSession (see prisma/schema.prisma) — this script does NOT create
 * any tables or touch the schema. It only writes a PartnerType row so a
 * business can select "POS" as its type at signup and get the "pos" module
 * (plus the bundled add-ons below) issued as default module access keys.
 * Individual sale records (src/app/partner/[partnerId]/pos/checkout/actions.ts)
 * remain BusinessRecord-backed under the "pos" module slug, same as every
 * other module's transactional records — nothing about that changes here.
 *
 * idPrefix: "POS" -- reads naturally (POS0001, POS0002, ...). Live-checked
 * below against every existing PartnerType row's idPrefix (not just the
 * known SC/CC/FF/MFG/WSB/EVB/LGL/EDU list from this session) before writing
 * anything, so a collision against ANY row already in the database fails
 * loudly instead of silently interleaving two types' Partner ID sequences.
 *
 * defaultModules: ["pos", "billing", "inventory"] --
 *   - "pos" is the type's own vertical module.
 *   - "billing" is the same cross-cutting baseline every vertical type in
 *     this session gets (see seed-new-vertical-partner-types.ts) --
 *     completeSaleAction() already creates a real Billing invoice for every
 *     sale (src/app/partner/[partnerId]/pos/checkout/actions.ts), so Billing
 *     isn't optional infrastructure for a POS partner, it's load-bearing.
 *   - "inventory" is included because POS's checkout flow already reads and
 *     live-deducts "inventory-stock" BusinessRecords on every completed sale
 *     and restores them on void (see completeSaleAction/voidSaleAction in
 *     the file above) -- a POS-only retail signup with no Inventory module
 *     enabled would have checkout silently fail every sale for lack of any
 *     stock records to deduct against, so bundling it by default (matching
 *     how this session's other new vertical types bundled their real
 *     cross-cutting dependencies) is the correct default, not just a nice-to-have.
 *   Deliberately NOT bundling hrms/marketplace/accounting -- unlike the 5
 *   new verticals seeded earlier this session (which got the full
 *   hrms/marketplace/accounting bundle per that task's explicit
 *   instruction), a pure POS retail counter has no built-in staff-payroll,
 *   cross-tenant-marketplace, or double-entry-books touchpoint the way
 *   completeSaleAction touches Billing and Inventory -- PosStaff is POS's
 *   own dedicated staff table already, not HRMS's Employee model, so
 *   bundling hrms in by default would be misleading rather than helpful.
 *   A Super Admin can still add any of these later via /admin/partner-types
 *   without touching this script.
 *
 * status: "Active", requiresApproval: false -- open self-serve signup,
 * matching service-centre/telecalling/the 5 new-vertical types' pattern.
 *
 * planTierByPage/assignableRoleIds/planIds left at their empty-default shape
 * ({}/[]/[]) -- same confirmed-safe shape every other new-vertical seed
 * script in this session used.
 *
 * Idempotent: the write is an upsert keyed by id ("pos"), safe to re-run.
 *
 * Does NOT run any prisma migrate/db push -- PartnerType is an existing
 * table; this only writes a row into it.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-pos-partner-type.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POS_TYPE = {
  id: "pos",
  description:
    "POS / Retail Checkout: store-exclusive point of sale with till/cash-session management, staff roles, receipts, returns/voids, and live Inventory stock deduction on every sale.",
  idPrefix: "POS",
} as const;

async function main() {
  // Live collision check against EVERY existing PartnerType row (not just
  // the SC/CC/FF/MFG/WSB/EVB/LGL/EDU prefixes known from this session), per
  // this task's instruction to verify live rather than trust a stale list.
  const existing = await prisma.partnerType.findMany({
    select: { id: true, idPrefix: true, status: true },
  });
  const collisions = existing.filter(
    (row) => row.idPrefix === POS_TYPE.idPrefix && row.id !== POS_TYPE.id
  );
  if (collisions.length > 0) {
    throw new Error(
      `Refusing to seed: idPrefix collision with existing PartnerType row(s): ${collisions
        .map((c) => `${c.id} (idPrefix "${c.idPrefix}", status ${c.status})`)
        .join(", ")}`
    );
  }
  console.log(
    `Collision check passed: no existing PartnerType row uses idPrefix "${POS_TYPE.idPrefix}" (checked ${existing.length} existing row(s)).`
  );

  const defaultModules = ["pos", "billing", "inventory"];
  await prisma.partnerType.upsert({
    where: { id: POS_TYPE.id },
    create: {
      id: POS_TYPE.id,
      description: POS_TYPE.description,
      defaultModules,
      assignableRoleIds: [],
      planTierByPage: {},
      planIds: [],
      idPrefix: POS_TYPE.idPrefix,
      requiresApproval: false,
      status: "Active",
    },
    update: {
      description: POS_TYPE.description,
      defaultModules,
      idPrefix: POS_TYPE.idPrefix,
      requiresApproval: false,
      status: "Active",
    },
  });
  console.log(
    `PartnerType upserted: "${POS_TYPE.id}" (idPrefix "${POS_TYPE.idPrefix}", Active, defaultModules: ${defaultModules.join(", ")})`
  );

  console.log("\nDone. Reload /signup -- POS should now be selectable as its own business type.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
