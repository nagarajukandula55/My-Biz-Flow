/**
 * One-off seed: creates the "telecalling" PartnerType row (idPrefix "CC")
 * so a future self-serve signup for the Telecalling / Call Centre business
 * type gets CC0001, CC0002, ... ids — completely independent of, and never
 * touching, the "service-centre" PartnerType row or its "SC" sequence (see
 * scripts/seed-launch-data.ts, a SEPARATE file this script never imports or
 * modifies). src/lib/partnerData.ts's nextPartnerId() counts only existing
 * Partner rows whose id already starts with the SAME prefix
 * (`WHERE id STARTS WITH <prefix>`), so CC and SC sequences cannot collide,
 * skip, or influence each other's numbering — verified in
 * src/lib/partnerData.ts, not assumed here.
 *
 * status: "Draft" (NOT "Active") on purpose — listActivePartnerTypes()
 * (src/lib/designer/partnerTypesData.ts) is the ONLY thing that decides
 * whether a PartnerType appears on the public /signup and /pricing
 * business-type choosers, and it filters on status: "Active". Keeping this
 * at "Draft" means self-serve signup for Telecalling stays exactly what the
 * public home page already promises ("Coming Soon" — src/app/page.tsx) even
 * after this script runs; flip status to "Active" below (and re-run) only
 * when you're ready to actually open public signup for it.
 *
 * requiresApproval: true as defense in depth — even if a "telecalling"
 * partnerTypeId were ever posted to /signup directly (bypassing the
 * dropdown, which only ever offers Active types), src/app/signup/actions.ts
 * does not independently re-check status before creating an account; it DOES
 * check requiresApproval and, when true, creates a PartnerSignupRequest for
 * Super Admin review instead of an instant live Partner. Belt-and-suspenders
 * alongside the Draft status above, not a replacement for it.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-telecalling-partner-type.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.partnerType.upsert({
    where: { id: "telecalling" },
    create: {
      id: "telecalling",
      description:
        "Telecalling / Call Centre: bulk-upload contact lists, assign to telecaller agents, click-to-call, and trigger SMS/WhatsApp template messages.",
      defaultModules: ["telecalling"],
      assignableRoleIds: [],
      planTierByPage: {},
      planIds: [],
      idPrefix: "CC",
      requiresApproval: true,
      status: "Draft",
    },
    update: {
      defaultModules: ["telecalling"],
      idPrefix: "CC",
      requiresApproval: true,
      // status intentionally NOT reset on update -- if a Super Admin has
      // already flipped this to "Active" from /admin, re-running this seed
      // (e.g. after a defaultModules tweak) must not silently hide it again.
    },
  });
  console.log('PartnerType upserted: "telecalling" (idPrefix "CC", status "Draft" -- not yet open for public signup).');
  console.log('Flip status to "Active" (via Super Admin /admin/partner-types, or a direct update) when ready to launch it publicly.');

  const serviceCentre = await prisma.partnerType.findUnique({ where: { id: "service-centre" } });
  console.log(
    serviceCentre
      ? `Verified untouched: "service-centre" is still idPrefix "${serviceCentre.idPrefix}", status "${serviceCentre.status}".`
      : 'Note: no "service-centre" row found in this database yet (run scripts/seed-launch-data.ts if this is a fresh DB).'
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
