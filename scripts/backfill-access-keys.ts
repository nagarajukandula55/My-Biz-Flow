/**
 * One-off backfill: issues an active ModuleAccessKey for every module in a
 * partner's PartnerType.defaultModules, for any partner created BEFORE
 * createPartner() started auto-issuing these at signup (see
 * issueDefaultModuleAccessKeys in src/lib/partnerData.ts). Without this,
 * an old partner has zero active keys and getVisibleModuleSlugs() —
 * exactly what the sidebar/dashboard render from — shows nothing.
 *
 * Idempotent: issueAccessKey() upserts, safe to re-run.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/backfill-access-keys.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateKey(moduleSlug: string): string {
  const suffix = randomBytes(6).toString("hex").toUpperCase();
  return `MBF-${moduleSlug.toUpperCase()}-${suffix}`;
}

async function main() {
  const partners = await prisma.partner.findMany();
  let issued = 0;

  for (const partner of partners) {
    const partnerType = await prisma.partnerType.findUnique({ where: { id: partner.partnerTypeId } });
    const modules = (partnerType?.defaultModules as string[] | null) ?? [];
    for (const slug of modules) {
      const existing = await prisma.moduleAccessKey.findUnique({
        where: { partnerId_moduleSlug: { partnerId: partner.id, moduleSlug: slug } },
      });
      if (existing?.status === "active") continue;
      await prisma.moduleAccessKey.upsert({
        where: { partnerId_moduleSlug: { partnerId: partner.id, moduleSlug: slug } },
        create: { partnerId: partner.id, moduleSlug: slug, key: generateKey(slug), status: "active", note: "Backfilled" },
        update: { key: generateKey(slug), status: "active", revokedAt: null, note: "Backfilled" },
      });
      issued += 1;
      console.log(`Issued: ${partner.id} -> ${slug}`);
    }
  }

  console.log(`\nDone. ${issued} access key(s) issued/reactivated across ${partners.length} partner(s).`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
