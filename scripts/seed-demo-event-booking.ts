/**
 * Creates (or confirms) a standalone DEMO Event Booking partner account,
 * fully populated with realistic dummy data across Event Booking (Venues /
 * Resources / Bookings) plus the cross-cutting HRMS, Marketplace, and
 * Accounting add-ons that the "event-booking" PartnerType bundles by
 * default (see scripts/seed-new-vertical-partner-types.ts).
 *
 * Separate from src/lib/demoPartnerSeed.ts (the existing Service Centre
 * DEMO0001 account) — that file is untouched. Uses the shared helper in
 * src/lib/demoNewVerticalsShared.ts for the Partner-creation boilerplate.
 *
 * Demo id: "DEMO-EVB0001" (never a real "EVB####" id, so nextPartnerId()'s
 * per-prefix count in src/lib/partnerData.ts is never inflated).
 * Login contact: 9999910003 / password: DemoPartner@123, no OTP,
 * mustChangePassword false.
 *
 * Idempotent — every insert is guarded by an existence check, safe to
 * re-run. Does NOT run any prisma migrate/db push and does NOT touch
 * prisma/schema.prisma, prisma/migrations/, or demoPartnerSeed.ts.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/seed-demo-event-booking.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureDemoVerticalPartner, mulberry32, daysAgoDate, DEMO_PASSWORD } from "../src/lib/demoNewVerticalsShared";

const DEMO_ID = "DEMO-EVB0001";
const LOGIN_CONTACT = "9999910003";

async function seedEventBooking(partnerId: string) {
  const existing = await prisma.venue.count({ where: { partnerId } });
  if (existing > 0) {
    console.log("Event Booking data already seeded — skipping.");
    return;
  }

  const venueGrand = await prisma.venue.create({ data: { partnerId, name: "Grand Banquet Hall", address: "MG Road, Pune", capacity: 500, isActive: true } });
  const venueGarden = await prisma.venue.create({ data: { partnerId, name: "Garden Lawn", address: "MG Road, Pune", capacity: 800, isActive: true } });
  const venueConf = await prisma.venue.create({ data: { partnerId, name: "Conference Room A", address: "MG Road, Pune", capacity: 60, isActive: true } });

  const resSound = await prisma.eventResource.create({ data: { partnerId, name: "Sound System — Premium", category: "Audio", isActive: true } });
  const resCatering = await prisma.eventResource.create({ data: { partnerId, name: "Catering Staff (per 10)", category: "Catering", isActive: true } });
  const resChairs = await prisma.eventResource.create({ data: { partnerId, name: "Banquet Chairs (per 50)", category: "Furniture", isActive: true } });
  const resLighting = await prisma.eventResource.create({ data: { partnerId, name: "Stage Lighting Rig", category: "Lighting", isActive: true } });

  const today = new Date();
  const day = (n: number) => new Date(today.getTime() - n * 86400000);
  const hoursLater = (d: Date, h: number) => new Date(d.getTime() + h * 3600000);

  async function createBooking(
    eventName: string,
    venue: typeof venueGrand,
    customerName: string,
    customerContact: string,
    status: string,
    startAt: Date,
    hours: number,
    totalAmount: number,
    amountPaid: number,
    resources: { resource: typeof resSound; qty: number }[]
  ) {
    const booking = await prisma.eventBooking.create({
      data: {
        partnerId,
        venueId: venue.id,
        eventName,
        bookingType: "OneTime",
        startAt,
        endAt: hoursLater(startAt, hours),
        customerName,
        customerContact,
        status,
        totalAmount,
        amountPaid,
      },
    });
    for (const r of resources) {
      await prisma.eventResourceAllocation.create({ data: { eventBookingId: booking.id, resourceId: r.resource.id, quantity: r.qty } });
    }
    return booking;
  }

  await createBooking("Sharma Wedding Reception", venueGrand, "Rohit Sharma", "9876522001", "Confirmed", day(-3), 6, 45000000, 20000000, [
    { resource: resSound, qty: 1 },
    { resource: resCatering, qty: 20 },
    { resource: resChairs, qty: 10 },
  ]);
  await createBooking("Acme Corp Annual Meet", venueConf, "Acme Corp Pvt Ltd", "9876522002", "Requested", day(-10), 4, 8000000, 0, [
    { resource: resSound, qty: 1 },
  ]);
  await createBooking("Reddy Birthday Party", venueGarden, "Lakshmi Reddy", "9876522003", "Completed", day(15), 5, 22000000, 22000000, [
    { resource: resCatering, qty: 8 },
    { resource: resLighting, qty: 1 },
  ]);
  await createBooking("TechConf 2026", venueConf, "TechConf India", "9876522004", "Cancelled", day(20), 8, 15000000, 5000000, []);
  await createBooking("Iyer Engagement Ceremony", venueGrand, "Kavya Iyer", "9876522005", "InProgress", day(0), 4, 30000000, 15000000, [
    { resource: resSound, qty: 1 },
    { resource: resChairs, qty: 15 },
  ]);

  // Historical tail — ~35 bookings across 6 months for calendar/report shape.
  const rng = mulberry32(20260925);
  const venues = [venueGrand, venueGarden, venueConf];
  const eventTypes = ["Wedding", "Birthday Party", "Corporate Meet", "Anniversary", "Product Launch", "Conference"];
  const statuses = ["Completed", "Completed", "Completed", "Cancelled", "Confirmed"];
  for (let i = 0; i < 35; i++) {
    const ageDays = 25 + Math.floor(rng() * 150);
    const v = venues[Math.floor(rng() * venues.length)];
    const s = statuses[Math.floor(rng() * statuses.length)];
    const amount = 5000000 + Math.floor(rng() * 40000000);
    const paid = s === "Completed" ? amount : Math.round(amount * rng());
    await createBooking(
      `${eventTypes[Math.floor(rng() * eventTypes.length)]} — Booking ${i + 1}`,
      v,
      `Customer ${i + 1}`,
      `98765${String(23000 + i).padStart(5, "0")}`,
      s,
      day(ageDays),
      3 + Math.floor(rng() * 6),
      amount,
      paid,
      [{ resource: resChairs, qty: 5 + Math.floor(rng() * 15) }]
    );
  }

  console.log("Event Booking: 3 venues, 4 resources, 5 recent + 35 historical bookings seeded.");
}

async function seedHrms(partnerId: string) {
  const existing = await prisma.employee.count({ where: { partnerId } });
  if (existing > 0) return;

  const office = await prisma.officeLocation.create({ data: { partnerId, name: "Event Office — MG Road", lat: 18.5246, lng: 73.8786, geofenceRadiusMeters: 200 } });

  const manager = await prisma.employee.create({ data: { partnerId, name: "Neha Kulkarni", designation: "Events Manager", department: "Operations", joiningDate: daysAgoDate(600), status: "Active", contact: "9999920021" } });
  const emp2 = await prisma.employee.create({ data: { partnerId, name: "Arjun Pillai", designation: "Coordinator", department: "Operations", reportingManagerId: manager.id, joiningDate: daysAgoDate(180), status: "Active", contact: "9999920022" } });

  for (const emp of [manager, emp2]) {
    await prisma.leaveBalance.createMany({ data: [{ employeeId: emp.id, leaveType: "Casual", totalDays: 12, usedDays: 2 }, { employeeId: emp.id, leaveType: "Sick", totalDays: 8, usedDays: 0 }] });
    for (let d = 1; d <= 4; d++) {
      await prisma.attendanceCheckIn.create({ data: { employeeId: emp.id, checkInAt: daysAgoDate(d), checkOutAt: new Date(daysAgoDate(d).getTime() + 9 * 3600000), checkInLat: office.lat, checkInLng: office.lng, status: "Present" } });
    }
  }

  console.log("HRMS: 1 office location, 2 employees, attendance/leave data seeded.");
}

async function seedMarketplace(partnerId: string) {
  const existing = await prisma.marketplaceListing.count({ where: { partnerId } });
  if (existing > 0) return;

  await prisma.marketplaceVendor.upsert({ where: { partnerId }, create: { partnerId, isActive: true }, update: { isActive: true } });

  const listing = await prisma.marketplaceListing.create({ data: { partnerId, title: "Grand Banquet Hall — Full Day Hire", description: "Includes basic sound and chairs.", price: 45000000, stockQuantity: 1, category: "Venue", isActive: true } });
  await prisma.marketplaceOrder.create({ data: { partnerId, listingId: listing.id, customerName: "Rohit Sharma", customerContact: "9876522001", quantity: 1, totalAmount: 45000000, status: "Confirmed", orderedAt: daysAgoDate(3) } });

  console.log("Marketplace: vendor row + 1 listing + 1 order seeded.");
}

async function seedAccounting(partnerId: string) {
  const existing = await prisma.chartOfAccount.count({ where: { partnerId } });
  if (existing > 0) return;

  const revenue = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "4000", accountName: "Booking Revenue", accountType: "Income" } });
  const cash = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "1000", accountName: "Cash & Bank", accountType: "Asset" } });

  const je = await prisma.journalEntry.create({ data: { partnerId, entryNumber: "JE-DEMO-0001", entryDate: daysAgoDate(15), narration: "Advance received — Reddy Birthday Party booking", sourceType: "EventBooking" } });
  await prisma.journalLine.createMany({ data: [
    { journalEntryId: je.id, accountId: cash.id, debit: 22000000, credit: 0 },
    { journalEntryId: je.id, accountId: revenue.id, debit: 0, credit: 22000000 },
  ] });

  const now = new Date();
  await prisma.fiscalPeriod.create({ data: { partnerId, name: `FY ${now.getFullYear()}-${now.getFullYear() + 1}`, startDate: new Date(now.getFullYear(), 3, 1), endDate: new Date(now.getFullYear() + 1, 2, 31), isClosed: false } });

  console.log("Accounting: 2 chart-of-accounts rows, 1 journal entry, 1 fiscal period seeded.");
}

async function main() {
  const { partner, alreadyExisted } = await ensureDemoVerticalPartner({
    id: DEMO_ID,
    partnerTypeId: "event-booking",
    businessName: "Demo Event & Venue Bookings",
    addressLine: "MG Road Complex, 2nd Floor",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    loginContact: LOGIN_CONTACT,
    businessEmail: "demo.events@mybizflow.in",
  });
  console.log(alreadyExisted ? `Partner "${partner.id}" already existed.` : `Created partner "${partner.id}".`);

  await seedEventBooking(partner.id);
  await seedHrms(partner.id);
  await seedMarketplace(partner.id);
  await seedAccounting(partner.id);

  console.log("\nDemo Event Booking partner ready:");
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
