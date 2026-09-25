/**
 * Creates (or confirms) a standalone DEMO Wholesale B2B partner account,
 * fully populated with realistic dummy data across Wholesale B2B
 * (Customers / Price Tiers / Orders) plus the cross-cutting HRMS,
 * Marketplace, and Accounting add-ons that the "wholesale-b2b" PartnerType
 * bundles by default (see scripts/seed-new-vertical-partner-types.ts).
 *
 * Separate from src/lib/demoPartnerSeed.ts (the existing Service Centre
 * DEMO0001 account) — that file is untouched. Uses the shared helper in
 * src/lib/demoNewVerticalsShared.ts for the Partner-creation boilerplate.
 *
 * Demo id: "DEMO-WSB0001" (never a real "WSB####" id, so nextPartnerId()'s
 * per-prefix count in src/lib/partnerData.ts is never inflated).
 * Login contact: 9999910002 / password: DemoPartner@123, no OTP,
 * mustChangePassword false.
 *
 * Idempotent — every insert is guarded by an existence check, safe to
 * re-run. Does NOT run any prisma migrate/db push and does NOT touch
 * prisma/schema.prisma, prisma/migrations/, or demoPartnerSeed.ts.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/seed-demo-wholesale-b2b.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureDemoVerticalPartner, mulberry32, daysAgoDate, DEMO_PASSWORD } from "../src/lib/demoNewVerticalsShared";

const DEMO_ID = "DEMO-WSB0001";
const LOGIN_CONTACT = "9999910002";

async function seedWholesale(partnerId: string) {
  const existing = await prisma.wholesaleCustomer.count({ where: { partnerId } });
  if (existing > 0) {
    console.log("Wholesale B2B data already seeded — skipping.");
    return;
  }

  const tierGold = await prisma.priceTier.create({ data: { partnerId, name: "Gold Distributor", discountPercent: 15 } });
  const tierSilver = await prisma.priceTier.create({ data: { partnerId, name: "Silver Dealer", discountPercent: 8 } });
  const tierStandard = await prisma.priceTier.create({ data: { partnerId, name: "Standard", discountPercent: 0 } });

  const cust1 = await prisma.wholesaleCustomer.create({
    data: { partnerId, name: "Krishna Traders", contact: "9876511001", gstin: "29ABCDE1234F1Z5", creditLimit: 50000000, creditTermDays: 30, isActive: true },
  });
  const cust2 = await prisma.wholesaleCustomer.create({
    data: { partnerId, name: "Sai Distributors", contact: "9876511002", gstin: "29ABCDE5678F1Z9", creditLimit: 20000000, creditTermDays: 15, isActive: true },
  });
  const cust3 = await prisma.wholesaleCustomer.create({
    data: { partnerId, name: "New Horizon Retail", contact: "9876511003", gstin: null, creditLimit: 5000000, creditTermDays: 7, isActive: true },
  });

  const today = new Date();
  const day = (n: number) => new Date(today.getTime() - n * 86400000);

  const materials = [
    { id: "MAT-WS-001", label: "Cotton T-Shirt — White, M (Carton of 50)", price: 1200000 },
    { id: "MAT-WS-002", label: "Cotton T-Shirt — Black, L (Carton of 50)", price: 1250000 },
    { id: "MAT-WS-003", label: "Denim Jeans — 32W (Carton of 30)", price: 2100000 },
    { id: "MAT-WS-004", label: "Sports Socks — Assorted (Box of 100 pairs)", price: 450000 },
  ];

  async function createOrder(orderNumber: string, customer: typeof cust1, tier: typeof tierGold | null, status: string, orderDate: Date) {
    const rng = mulberry32(orderNumber.charCodeAt(orderNumber.length - 1) + orderDate.getDate());
    const lineCount = 1 + Math.floor(rng() * 3);
    let total = 0;
    const order = await prisma.wholesaleOrder.create({
      data: { partnerId, customerId: customer.id, priceTierId: tier?.id ?? null, orderNumber, status, orderDate, totalAmount: 0 },
    });
    for (let i = 0; i < lineCount; i++) {
      const m = materials[Math.floor(rng() * materials.length)];
      const qty = 2 + Math.floor(rng() * 8);
      const lineTotal = m.price * qty;
      total += lineTotal;
      await prisma.wholesaleOrderLine.create({
        data: { orderId: order.id, materialId: m.id, materialLabel: m.label, quantity: qty, unitPrice: m.price },
      });
    }
    await prisma.wholesaleOrder.update({ where: { id: order.id }, data: { totalAmount: total } });
    return order;
  }

  await createOrder("WSB-DEMO-0001", cust1, tierGold, "Pending", day(1));
  await createOrder("WSB-DEMO-0002", cust2, tierSilver, "Confirmed", day(3));
  await createOrder("WSB-DEMO-0003", cust1, tierGold, "Dispatched", day(6));
  await createOrder("WSB-DEMO-0004", cust3, tierStandard, "Delivered", day(12));
  await createOrder("WSB-DEMO-0005", cust2, tierSilver, "Cancelled", day(9));

  // Historical tail — ~40 orders spread over 90 days for order-volume trend.
  const rng = mulberry32(20260925);
  const customers = [cust1, cust2, cust3];
  const tiers = [tierGold, tierSilver, tierStandard];
  const statuses = ["Delivered", "Delivered", "Delivered", "Dispatched", "Confirmed", "Cancelled"];
  for (let i = 0; i < 40; i++) {
    const ageDays = 15 + Math.floor(rng() * 90);
    const c = customers[Math.floor(rng() * customers.length)];
    const t = tiers[Math.floor(rng() * tiers.length)];
    const s = statuses[Math.floor(rng() * statuses.length)];
    await createOrder(`WSB-HIST-${String(i + 1).padStart(4, "0")}`, c, t, s, day(ageDays));
  }

  console.log("Wholesale B2B: 3 price tiers, 3 customers, 5 recent orders + 40 historical orders seeded.");
}

async function seedHrms(partnerId: string) {
  const existing = await prisma.employee.count({ where: { partnerId } });
  if (existing > 0) return;

  const office = await prisma.officeLocation.create({
    data: { partnerId, name: "Warehouse — Whitefield", lat: 12.9698, lng: 77.75, geofenceRadiusMeters: 250 },
  });

  const manager = await prisma.employee.create({
    data: { partnerId, name: "Anil Deshpande", designation: "Sales Manager", department: "Sales", joiningDate: daysAgoDate(500), status: "Active", contact: "9999920011" },
  });
  const emp2 = await prisma.employee.create({
    data: { partnerId, name: "Divya Menon", designation: "Warehouse Executive", department: "Logistics", reportingManagerId: manager.id, joiningDate: daysAgoDate(250), status: "Active", contact: "9999920012" },
  });

  for (const emp of [manager, emp2]) {
    await prisma.leaveBalance.createMany({
      data: [
        { employeeId: emp.id, leaveType: "Casual", totalDays: 12, usedDays: 4 },
        { employeeId: emp.id, leaveType: "Sick", totalDays: 8, usedDays: 0 },
      ],
    });
    for (let d = 1; d <= 4; d++) {
      await prisma.attendanceCheckIn.create({
        data: { employeeId: emp.id, checkInAt: daysAgoDate(d), checkOutAt: new Date(daysAgoDate(d).getTime() + 8 * 3600000), checkInLat: office.lat, checkInLng: office.lng, status: "Present" },
      });
    }
  }

  console.log("HRMS: 1 office location, 2 employees, attendance/leave data seeded.");
}

async function seedMarketplace(partnerId: string) {
  const existing = await prisma.marketplaceListing.count({ where: { partnerId } });
  if (existing > 0) return;

  await prisma.marketplaceVendor.upsert({ where: { partnerId }, create: { partnerId, isActive: true }, update: { isActive: true } });

  const listing = await prisma.marketplaceListing.create({
    data: { partnerId, title: "Cotton T-Shirt Bulk Lot — Assorted", description: "Mixed size carton, wholesale only.", price: 1200000, stockQuantity: 200, category: "Apparel", isActive: true },
  });
  await prisma.marketplaceOrder.createMany({
    data: [
      { partnerId, listingId: listing.id, customerName: "Krishna Traders", customerContact: "9876511001", quantity: 10, totalAmount: 12000000, status: "Delivered", orderedAt: daysAgoDate(14) },
      { partnerId, listingId: listing.id, customerName: "Sai Distributors", customerContact: "9876511002", quantity: 5, totalAmount: 6000000, status: "Pending", orderedAt: daysAgoDate(1) },
    ],
  });

  console.log("Marketplace: vendor row + 1 listing + 2 orders seeded.");
}

async function seedAccounting(partnerId: string) {
  const existing = await prisma.chartOfAccount.count({ where: { partnerId } });
  if (existing > 0) return;

  const sales = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "4000", accountName: "Wholesale Sales", accountType: "Income" } });
  const receivable = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "1200", accountName: "Accounts Receivable", accountType: "Asset" } });

  const je = await prisma.journalEntry.create({
    data: { partnerId, entryNumber: "JE-DEMO-0001", entryDate: daysAgoDate(12), narration: "Wholesale order WSB-DEMO-0004 delivered on credit terms", sourceType: "WholesaleOrder" },
  });
  await prisma.journalLine.createMany({
    data: [
      { journalEntryId: je.id, accountId: receivable.id, debit: 2000000, credit: 0 },
      { journalEntryId: je.id, accountId: sales.id, debit: 0, credit: 2000000 },
    ],
  });

  const now = new Date();
  await prisma.fiscalPeriod.create({
    data: { partnerId, name: `FY ${now.getFullYear()}-${now.getFullYear() + 1}`, startDate: new Date(now.getFullYear(), 3, 1), endDate: new Date(now.getFullYear() + 1, 2, 31), isClosed: false },
  });

  console.log("Accounting: 2 chart-of-accounts rows, 1 journal entry, 1 fiscal period seeded.");
}

async function main() {
  const { partner, alreadyExisted } = await ensureDemoVerticalPartner({
    id: DEMO_ID,
    partnerTypeId: "wholesale-b2b",
    businessName: "Demo Wholesale Traders",
    addressLine: "Warehouse 7, Whitefield Industrial Estate",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560066",
    loginContact: LOGIN_CONTACT,
    businessEmail: "demo.wholesale@mybizflow.in",
  });
  console.log(alreadyExisted ? `Partner "${partner.id}" already existed.` : `Created partner "${partner.id}".`);

  await seedWholesale(partner.id);
  await seedHrms(partner.id);
  await seedMarketplace(partner.id);
  await seedAccounting(partner.id);

  console.log("\nDemo Wholesale B2B partner ready:");
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
