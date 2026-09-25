/**
 * Creates (or confirms) a standalone DEMO Legal partner account, fully
 * populated with realistic dummy data across Legal (Clients / Matters /
 * Court Dates / Documents) plus the cross-cutting HRMS, Marketplace, and
 * Accounting add-ons that the "legal" PartnerType bundles by default (see
 * scripts/seed-new-vertical-partner-types.ts).
 *
 * Separate from src/lib/demoPartnerSeed.ts (the existing Service Centre
 * DEMO0001 account) — that file is untouched. Uses the shared helper in
 * src/lib/demoNewVerticalsShared.ts for the Partner-creation boilerplate.
 *
 * Demo id: "DEMO-LGL0001" (never a real "LGL####" id, so nextPartnerId()'s
 * per-prefix count in src/lib/partnerData.ts is never inflated).
 * Login contact: 9999910004 / password: DemoPartner@123, no OTP,
 * mustChangePassword false.
 *
 * Idempotent — every insert is guarded by an existence check, safe to
 * re-run. Does NOT run any prisma migrate/db push and does NOT touch
 * prisma/schema.prisma, prisma/migrations/, or demoPartnerSeed.ts.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/seed-demo-legal.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureDemoVerticalPartner, mulberry32, daysAgoDate, DEMO_PASSWORD } from "../src/lib/demoNewVerticalsShared";

const DEMO_ID = "DEMO-LGL0001";
const LOGIN_CONTACT = "9999910004";

async function seedLegal(partnerId: string) {
  const existing = await prisma.legalClient.count({ where: { partnerId } });
  if (existing > 0) {
    console.log("Legal data already seeded — skipping.");
    return;
  }

  const clientA = await prisma.legalClient.create({ data: { partnerId, name: "Venkatesh Rao", contact: "9876533001", email: "venkatesh.rao@example.com", address: "Jubilee Hills, Hyderabad" } });
  const clientB = await prisma.legalClient.create({ data: { partnerId, name: "Bluewave Textiles Pvt Ltd", contact: "9876533002", email: "legal@bluewavetextiles.in", address: "Banjara Hills, Hyderabad" } });
  const clientC = await prisma.legalClient.create({ data: { partnerId, name: "Priyanka Menon", contact: "9876533003", email: "priyanka.menon@example.com", address: "Gachibowli, Hyderabad" } });

  const today = new Date();
  const day = (n: number) => new Date(today.getTime() - n * 86400000);

  const matter1 = await prisma.legalMatter.create({
    data: { partnerId, clientId: clientA.id, matterNumber: "MAT-DEMO-0001", title: "Property Boundary Dispute — Venkatesh Rao vs. Neighbor", matterType: "Civil", status: "InProgress", openedDate: day(60) },
  });
  await prisma.legalCourtDate.createMany({
    data: [
      { matterId: matter1.id, hearingDate: day(30), court: "City Civil Court, Hyderabad", purpose: "First hearing", outcome: "Adjourned — respondent sought time." },
      { matterId: matter1.id, hearingDate: day(-5), court: "City Civil Court, Hyderabad", purpose: "Evidence submission" },
    ],
  });
  await prisma.legalDocument.createMany({
    data: [
      { matterId: matter1.id, title: "Sale Deed Copy", documentType: "Evidence", uploadedAt: day(58) },
      { matterId: matter1.id, title: "Survey Report", documentType: "Evidence", uploadedAt: day(45) },
    ],
  });

  const matter2 = await prisma.legalMatter.create({
    data: { partnerId, clientId: clientB.id, matterNumber: "MAT-DEMO-0002", title: "Bluewave Textiles — Contract Breach Claim", matterType: "Commercial", status: "Open", openedDate: day(10) },
  });
  await prisma.legalCourtDate.create({ data: { matterId: matter2.id, hearingDate: day(-15), court: "Commercial Court, Hyderabad", purpose: "First hearing" } });
  await prisma.legalDocument.create({ data: { matterId: matter2.id, title: "Supply Agreement", documentType: "Contract", uploadedAt: day(10) } });

  const matter3 = await prisma.legalMatter.create({
    data: { partnerId, clientId: clientC.id, matterNumber: "MAT-DEMO-0003", title: "Priyanka Menon — Divorce Settlement", matterType: "Family", status: "Closed", openedDate: day(200), closedDate: day(20) },
  });
  await prisma.legalCourtDate.createMany({
    data: [
      { matterId: matter3.id, hearingDate: day(180), court: "Family Court, Hyderabad", purpose: "First hearing" },
      { matterId: matter3.id, hearingDate: day(90), court: "Family Court, Hyderabad", purpose: "Mediation" },
      { matterId: matter3.id, hearingDate: day(22), court: "Family Court, Hyderabad", purpose: "Final settlement", outcome: "Mutual consent decree granted." },
    ],
  });

  const matter4 = await prisma.legalMatter.create({
    data: { partnerId, clientId: clientA.id, matterNumber: "MAT-DEMO-0004", title: "Venkatesh Rao — Cheque Bounce Case", matterType: "Criminal", status: "OnHold", openedDate: day(120) },
  });
  await prisma.legalCourtDate.create({ data: { matterId: matter4.id, hearingDate: day(-2), court: "Metropolitan Magistrate Court", purpose: "Status hearing" } });

  // Upcoming court dates in the near future so the "court-date-upcoming" view shows real rows.
  await prisma.legalCourtDate.createMany({
    data: [
      { matterId: matter2.id, hearingDate: day(-20), court: "Commercial Court, Hyderabad", purpose: "Second hearing" },
      { matterId: matter4.id, hearingDate: day(-25), court: "Metropolitan Magistrate Court", purpose: "Next hearing" },
    ],
  });

  // Historical tail — additional closed matters over the last year for report shape.
  const rng = mulberry32(20260925);
  const clients = [clientA, clientB, clientC];
  const matterTypes = ["Civil", "Criminal", "Family", "Commercial", "Property"];
  for (let i = 0; i < 15; i++) {
    const ageDays = 40 + Math.floor(rng() * 300);
    const closedAgeDays = Math.max(5, ageDays - Math.floor(rng() * 60));
    const c = clients[Math.floor(rng() * clients.length)];
    const matter = await prisma.legalMatter.create({
      data: {
        partnerId,
        clientId: c.id,
        matterNumber: `MAT-HIST-${String(i + 1).padStart(4, "0")}`,
        title: `${matterTypes[Math.floor(rng() * matterTypes.length)]} Matter — Historical Case ${i + 1}`,
        matterType: matterTypes[Math.floor(rng() * matterTypes.length)],
        status: "Closed",
        openedDate: day(ageDays),
        closedDate: day(closedAgeDays),
      },
    });
    await prisma.legalCourtDate.create({ data: { matterId: matter.id, hearingDate: day(closedAgeDays + 3), court: "District Court, Hyderabad", purpose: "Final hearing", outcome: "Resolved." } });
  }

  console.log("Legal: 3 clients, 4 recent matters (with court dates/documents) + 15 historical closed matters seeded.");
}

async function seedHrms(partnerId: string) {
  const existing = await prisma.employee.count({ where: { partnerId } });
  if (existing > 0) return;

  const office = await prisma.officeLocation.create({ data: { partnerId, name: "Law Office — Banjara Hills", lat: 17.4126, lng: 78.4483, geofenceRadiusMeters: 150 } });

  const manager = await prisma.employee.create({ data: { partnerId, name: "Adv. Kiran Reddy", designation: "Senior Partner", department: "Legal", joiningDate: daysAgoDate(700), status: "Active", contact: "9999920031" } });
  const emp2 = await prisma.employee.create({ data: { partnerId, name: "Adv. Sneha Joshi", designation: "Associate", department: "Legal", reportingManagerId: manager.id, joiningDate: daysAgoDate(300), status: "Active", contact: "9999920032" } });

  for (const emp of [manager, emp2]) {
    await prisma.leaveBalance.createMany({ data: [{ employeeId: emp.id, leaveType: "Casual", totalDays: 12, usedDays: 5 }, { employeeId: emp.id, leaveType: "Sick", totalDays: 8, usedDays: 2 }] });
    for (let d = 1; d <= 4; d++) {
      await prisma.attendanceCheckIn.create({ data: { employeeId: emp.id, checkInAt: daysAgoDate(d), checkOutAt: new Date(daysAgoDate(d).getTime() + 8 * 3600000), checkInLat: office.lat, checkInLng: office.lng, status: "Present" } });
    }
  }

  console.log("HRMS: 1 office location, 2 employees, attendance/leave data seeded.");
}

async function seedMarketplace(partnerId: string) {
  const existing = await prisma.marketplaceListing.count({ where: { partnerId } });
  if (existing > 0) return;

  await prisma.marketplaceVendor.upsert({ where: { partnerId }, create: { partnerId, isActive: true }, update: { isActive: true } });

  const listing = await prisma.marketplaceListing.create({ data: { partnerId, title: "Legal Consultation — 1 Hour", description: "Initial consultation with a senior partner.", price: 250000, stockQuantity: 20, category: "Services", isActive: true } });
  await prisma.marketplaceOrder.create({ data: { partnerId, listingId: listing.id, customerName: "Priyanka Menon", customerContact: "9876533003", quantity: 1, totalAmount: 250000, status: "Delivered", orderedAt: daysAgoDate(25) } });

  console.log("Marketplace: vendor row + 1 listing + 1 order seeded.");
}

async function seedAccounting(partnerId: string) {
  const existing = await prisma.chartOfAccount.count({ where: { partnerId } });
  if (existing > 0) return;

  const fees = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "4000", accountName: "Legal Fees Income", accountType: "Income" } });
  const cash = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "1000", accountName: "Cash & Bank", accountType: "Asset" } });

  const je = await prisma.journalEntry.create({ data: { partnerId, entryNumber: "JE-DEMO-0001", entryDate: daysAgoDate(20), narration: "Settlement fee received — Priyanka Menon matter", sourceType: "LegalMatter" } });
  await prisma.journalLine.createMany({ data: [
    { journalEntryId: je.id, accountId: cash.id, debit: 5000000, credit: 0 },
    { journalEntryId: je.id, accountId: fees.id, debit: 0, credit: 5000000 },
  ] });

  const now = new Date();
  await prisma.fiscalPeriod.create({ data: { partnerId, name: `FY ${now.getFullYear()}-${now.getFullYear() + 1}`, startDate: new Date(now.getFullYear(), 3, 1), endDate: new Date(now.getFullYear() + 1, 2, 31), isClosed: false } });

  console.log("Accounting: 2 chart-of-accounts rows, 1 journal entry, 1 fiscal period seeded.");
}

async function main() {
  const { partner, alreadyExisted } = await ensureDemoVerticalPartner({
    id: DEMO_ID,
    partnerTypeId: "legal",
    businessName: "Demo Legal Associates",
    addressLine: "Road No. 12, Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    loginContact: LOGIN_CONTACT,
    businessEmail: "demo.legal@mybizflow.in",
  });
  console.log(alreadyExisted ? `Partner "${partner.id}" already existed.` : `Created partner "${partner.id}".`);

  await seedLegal(partner.id);
  await seedHrms(partner.id);
  await seedMarketplace(partner.id);
  await seedAccounting(partner.id);

  console.log("\nDemo Legal partner ready:");
  console.log(`  Partner ID: ${partner.id}`);
  console.log(`  Login contact: ${LOGIN_CONTACT}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
