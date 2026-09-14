/**
 * Wipes every partner and all partner-scoped data, keeping platform config
 * (PartnerType, Plan, Offer, Role, AccessGroup, PageAccess, Numbering main
 * schemes, Page/Module customizations, error logs) fully intact — those are
 * not partner-owned rows, they're the platform's own configuration built up
 * over this project.
 *
 * Requested explicitly: clear out all existing (test) partner data in
 * Postgres before importing real AN-CRM data. Deliberately narrow — only
 * partner-scoped tables are touched, nothing platform-level.
 *
 * Default: dry run (counts only, no deletes). Pass --confirm to actually delete.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/wipe-all-partner-data.ts            (dry run)
 *   DATABASE_URL=... npx tsx scripts/wipe-all-partner-data.ts --confirm  (real delete)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const confirm = process.argv.includes("--confirm");

/** Some partner-scoped tables in the current schema haven't been migrated onto production yet (P2021 = table doesn't exist) — treat that as "nothing to delete here" rather than failing the whole run. */
async function safeCount(label: string, fn: () => Promise<number>): Promise<number> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2021") {
      console.log(`  (table for ${label} doesn't exist on this database yet — skipping)`);
      return 0;
    }
    throw err;
  }
}

async function safeDeleteMany(label: string, fn: () => Promise<{ count: number }>): Promise<void> {
  try {
    const result = await fn();
    console.log(`  Deleted ${result.count} from ${label}`);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2021") {
      console.log(`  (table for ${label} doesn't exist — skipping)`);
      return;
    }
    throw err;
  }
}

async function main() {
  const partnerCount = await prisma.partner.count();
  console.log(`Partners found: ${partnerCount}`);

  // Every partner-scoped table, in an order that's safe regardless of FK
  // enforcement (most partnerId references in this schema are loose string
  // fields, not enforced foreign keys, per the schema's own comments).
  const counts: Record<string, number> = {
    BusinessRecord: await safeCount("BusinessRecord", () => prisma.businessRecord.count()),
    NumberingCounter: await safeCount("NumberingCounter", () => prisma.numberingCounter.count()),
    NumberingPartnerScheme: await safeCount("NumberingPartnerScheme", () => prisma.numberingPartnerScheme.count()),
    ModuleAccessKey: await safeCount("ModuleAccessKey", () => prisma.moduleAccessKey.count()),
    PartnerStaff: await safeCount("PartnerStaff", () => prisma.partnerStaff.count()),
    Provider: await safeCount("Provider", () => prisma.provider.count()),
    JobAllocation: await safeCount("JobAllocation", () => prisma.jobAllocation.count()),
    JobOffer: await safeCount("JobOffer", () => prisma.jobOffer.count()),
    Notification: await safeCount("Notification", () => prisma.notification.count()),
    FieldForceSettings: await safeCount("FieldForceSettings", () => prisma.fieldForceSettings.count()),
    TelegramSettings: await safeCount("TelegramSettings", () => prisma.telegramSettings.count()),
    TelegramLogEntry: await safeCount("TelegramLogEntry", () => prisma.telegramLogEntry.count()),
    Customer: await safeCount("Customer", () => prisma.customer.count()),
    Address: await safeCount("Address", () => prisma.address.count()),
    Booking: await safeCount("Booking", () => prisma.booking.count()),
    BookingPayment: await safeCount("BookingPayment", () => prisma.bookingPayment.count()),
    SubscriptionPayment: await safeCount("SubscriptionPayment", () => prisma.subscriptionPayment.count()),
    PartnerSignupRequest: await safeCount("PartnerSignupRequest", () => prisma.partnerSignupRequest.count()),
  };

  console.log("Partner-scoped row counts:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`);
  }

  if (!confirm) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --confirm to actually wipe.");
    return;
  }

  console.log("\n--confirm passed — deleting now.");

  await safeDeleteMany("BookingPayment", () => prisma.bookingPayment.deleteMany({}));
  await safeDeleteMany("Booking", () => prisma.booking.deleteMany({}));
  await safeDeleteMany("Address", () => prisma.address.deleteMany({}));
  await safeDeleteMany("Customer", () => prisma.customer.deleteMany({}));
  await safeDeleteMany("TelegramLogEntry", () => prisma.telegramLogEntry.deleteMany({}));
  await safeDeleteMany("TelegramSettings", () => prisma.telegramSettings.deleteMany({}));
  await safeDeleteMany("FieldForceSettings", () => prisma.fieldForceSettings.deleteMany({}));
  await safeDeleteMany("Notification", () => prisma.notification.deleteMany({}));
  await safeDeleteMany("JobOffer", () => prisma.jobOffer.deleteMany({}));
  await safeDeleteMany("JobAllocation", () => prisma.jobAllocation.deleteMany({}));
  await safeDeleteMany("ProviderServiceArea", () => prisma.providerServiceArea.deleteMany({}));
  await safeDeleteMany("ProviderService", () => prisma.providerService.deleteMany({}));
  await safeDeleteMany("Provider", () => prisma.provider.deleteMany({}));
  await safeDeleteMany("PartnerStaff", () => prisma.partnerStaff.deleteMany({}));
  await safeDeleteMany("ModuleAccessKey", () => prisma.moduleAccessKey.deleteMany({}));
  await safeDeleteMany("NumberingPartnerScheme", () => prisma.numberingPartnerScheme.deleteMany({}));
  await safeDeleteMany("NumberingCounter", () => prisma.numberingCounter.deleteMany({}));
  await safeDeleteMany("SubscriptionPayment", () => prisma.subscriptionPayment.deleteMany({}));
  await safeDeleteMany("PartnerSignupRequest", () => prisma.partnerSignupRequest.deleteMany({}));
  await safeDeleteMany("BusinessRecord", () => prisma.businessRecord.deleteMany({}));
  const deletedPartners = await prisma.partner.deleteMany({});

  console.log(`\nDone. Deleted ${deletedPartners.count} Partner row(s) and all their scoped data.`);
  console.log("PartnerType, Plan, Offer, Role, AccessGroup, PageAccess, and Numbering main schemes were left untouched.");
}

main()
  .catch((err) => {
    console.error("Wipe failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
