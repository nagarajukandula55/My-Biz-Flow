/**
 * Creates (or confirms) a standalone DEMO Manufacturing partner account,
 * fully populated with realistic dummy data across Manufacturing (BOM /
 * Work Centers / Production Orders) plus the cross-cutting HRMS,
 * Marketplace, and Accounting add-ons that the "manufacturing" PartnerType
 * bundles by default (see scripts/seed-new-vertical-partner-types.ts).
 *
 * Separate from src/lib/demoPartnerSeed.ts (the existing Service Centre
 * DEMO0001 account) — that file is untouched. Uses the shared helper in
 * src/lib/demoNewVerticalsShared.ts for the Partner-creation boilerplate.
 *
 * Demo id: "DEMO-MFG0001" (never a real "MFG####" id, so nextPartnerId()'s
 * per-prefix count in src/lib/partnerData.ts is never inflated).
 * Login contact: 9999910001 / password: DemoPartner@123 (see
 * DEMO_PASSWORD in the shared helper), no OTP, mustChangePassword false.
 *
 * Idempotent — every insert is guarded by an existence check, safe to
 * re-run. Does NOT run any prisma migrate/db push and does NOT touch
 * prisma/schema.prisma, prisma/migrations/, or demoPartnerSeed.ts.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/seed-demo-manufacturing.ts
 */
import { prisma } from "../src/lib/prisma";
import { ensureDemoVerticalPartner, mulberry32, daysAgoDate, DEMO_PASSWORD } from "../src/lib/demoNewVerticalsShared";

const DEMO_ID = "DEMO-MFG0001";
const LOGIN_CONTACT = "9999910001";

async function seedManufacturing(partnerId: string) {
  const existingBoms = await prisma.billOfMaterial.count({ where: { partnerId } });
  if (existingBoms > 0) {
    console.log("Manufacturing data already seeded — skipping.");
    return;
  }

  // Work Centers
  const wcAssembly = await prisma.workCenter.create({
    data: { partnerId, name: "Assembly Line 1", capacityPerDay: 50, isActive: true },
  });
  const wcPaint = await prisma.workCenter.create({
    data: { partnerId, name: "Paint & Finishing", capacityPerDay: 40, isActive: true },
  });
  const wcQc = await prisma.workCenter.create({
    data: { partnerId, name: "Quality Control Bay", capacityPerDay: 60, isActive: true },
  });

  // Bill of Materials — 3, each with a few lines
  const bomChair = await prisma.billOfMaterial.create({
    data: { partnerId, productName: "Steel Office Chair — Model SC-100", productCode: "SC-100", version: 1, isActive: true },
  });
  await prisma.bomLine.createMany({
    data: [
      { bomId: bomChair.id, materialId: "MAT-FRM-001", materialLabel: "Steel Frame Set", quantity: 1, unitCost: 85000 },
      { bomId: bomChair.id, materialId: "MAT-CSH-002", materialLabel: "Foam Cushion Pad", quantity: 2, unitCost: 25000 },
      { bomId: bomChair.id, materialId: "MAT-WHL-003", materialLabel: "Caster Wheel Set (5pc)", quantity: 1, unitCost: 18000 },
    ],
  });

  const bomTable = await prisma.billOfMaterial.create({
    data: { partnerId, productName: "Folding Table — Model FT-220", productCode: "FT-220", version: 2, isActive: true },
  });
  await prisma.bomLine.createMany({
    data: [
      { bomId: bomTable.id, materialId: "MAT-TOP-004", materialLabel: "Laminated MDF Top 4x2ft", quantity: 1, unitCost: 140000 },
      { bomId: bomTable.id, materialId: "MAT-LEG-005", materialLabel: "Folding Leg Assembly", quantity: 4, unitCost: 22000 },
    ],
  });

  const bomCabinet = await prisma.billOfMaterial.create({
    data: { partnerId, productName: "Storage Cabinet — Model SB-310", productCode: "SB-310", version: 1, isActive: false },
  });
  await prisma.bomLine.createMany({
    data: [
      { bomId: bomCabinet.id, materialId: "MAT-PNL-006", materialLabel: "Powder-Coated Steel Panel", quantity: 5, unitCost: 60000 },
      { bomId: bomCabinet.id, materialId: "MAT-HNG-007", materialLabel: "Hinge & Lock Set", quantity: 2, unitCost: 15000 },
    ],
  });

  const today = new Date();
  const day = (n: number) => new Date(today.getTime() - n * 86400000);

  // Production Orders across statuses, at least one full-lifecycle Completed
  const po1 = await prisma.productionOrder.create({
    data: {
      partnerId,
      bomId: bomChair.id,
      productName: bomChair.productName,
      quantityPlanned: 200,
      quantityProduced: 200,
      workCenterId: wcAssembly.id,
      status: "Completed",
      plannedStartDate: day(20),
      plannedEndDate: day(12),
      actualCompletionDate: day(11),
      createdAt: day(21),
    },
  });
  await prisma.productionStageHistory.createMany({
    data: [
      { productionOrderId: po1.id, stage: "Planned", enteredAt: day(21) },
      { productionOrderId: po1.id, stage: "InProduction", enteredAt: day(19) },
      { productionOrderId: po1.id, stage: "QC", enteredAt: day(13) },
      { productionOrderId: po1.id, stage: "Completed", enteredAt: day(11), note: "All 200 units passed QC." },
    ],
  });

  const po2 = await prisma.productionOrder.create({
    data: {
      partnerId,
      bomId: bomTable.id,
      productName: bomTable.productName,
      quantityPlanned: 120,
      quantityProduced: 120,
      workCenterId: wcPaint.id,
      status: "Completed",
      plannedStartDate: day(45),
      plannedEndDate: day(38),
      actualCompletionDate: day(37),
      createdAt: day(46),
    },
  });
  await prisma.productionStageHistory.createMany({
    data: [
      { productionOrderId: po2.id, stage: "Planned", enteredAt: day(46) },
      { productionOrderId: po2.id, stage: "InProduction", enteredAt: day(44) },
      { productionOrderId: po2.id, stage: "QC", enteredAt: day(39) },
      { productionOrderId: po2.id, stage: "Completed", enteredAt: day(37) },
    ],
  });

  const po3 = await prisma.productionOrder.create({
    data: {
      partnerId,
      bomId: bomChair.id,
      productName: bomChair.productName,
      quantityPlanned: 150,
      quantityProduced: 90,
      workCenterId: wcAssembly.id,
      status: "InProduction",
      plannedStartDate: day(5),
      plannedEndDate: day(-2),
      createdAt: day(6),
    },
  });
  await prisma.productionStageHistory.createMany({
    data: [
      { productionOrderId: po3.id, stage: "Planned", enteredAt: day(6) },
      { productionOrderId: po3.id, stage: "InProduction", enteredAt: day(4) },
    ],
  });

  const po4 = await prisma.productionOrder.create({
    data: {
      partnerId,
      bomId: bomTable.id,
      productName: bomTable.productName,
      quantityPlanned: 80,
      quantityProduced: 0,
      workCenterId: wcQc.id,
      status: "Planned",
      plannedStartDate: day(-1),
      plannedEndDate: day(6),
      createdAt: day(2),
    },
  });
  await prisma.productionStageHistory.create({
    data: { productionOrderId: po4.id, stage: "Planned", enteredAt: day(2) },
  });

  const po5 = await prisma.productionOrder.create({
    data: {
      partnerId,
      bomId: bomCabinet.id,
      productName: bomCabinet.productName,
      quantityPlanned: 60,
      quantityProduced: 15,
      workCenterId: wcAssembly.id,
      status: "Delayed",
      plannedStartDate: day(15),
      plannedEndDate: day(2),
      createdAt: day(16),
    },
  });
  await prisma.productionStageHistory.createMany({
    data: [
      { productionOrderId: po5.id, stage: "Planned", enteredAt: day(16) },
      { productionOrderId: po5.id, stage: "InProduction", enteredAt: day(14) },
      { productionOrderId: po5.id, stage: "Delayed", enteredAt: day(3), note: "Steel panel supplier delay." },
    ],
  });

  // Historical tail — additional Completed production orders spread over
  // ~90 days so a "production completed" trend chart has real shape.
  const rng = mulberry32(20260925);
  const products = [
    { bom: bomChair, wc: wcAssembly },
    { bom: bomTable, wc: wcPaint },
    { bom: bomCabinet, wc: wcQc },
  ];
  for (let i = 0; i < 18; i++) {
    const ageDays = 25 + Math.floor(rng() * 90);
    const p = products[Math.floor(rng() * products.length)];
    const qty = 40 + Math.floor(rng() * 160);
    const po = await prisma.productionOrder.create({
      data: {
        partnerId,
        bomId: p.bom.id,
        productName: p.bom.productName,
        quantityPlanned: qty,
        quantityProduced: qty,
        workCenterId: p.wc.id,
        status: "Completed",
        plannedStartDate: day(ageDays + 6),
        plannedEndDate: day(ageDays),
        actualCompletionDate: day(ageDays),
        createdAt: day(ageDays + 7),
      },
    });
    await prisma.productionStageHistory.createMany({
      data: [
        { productionOrderId: po.id, stage: "Planned", enteredAt: day(ageDays + 7) },
        { productionOrderId: po.id, stage: "InProduction", enteredAt: day(ageDays + 4) },
        { productionOrderId: po.id, stage: "Completed", enteredAt: day(ageDays) },
      ],
    });
  }

  console.log("Manufacturing: 3 BOMs, 3 Work Centers, 5 recent Production Orders + 18 historical Completed orders seeded.");
}

async function seedHrms(partnerId: string) {
  const existing = await prisma.employee.count({ where: { partnerId } });
  if (existing > 0) return;

  const office = await prisma.officeLocation.create({
    data: { partnerId, name: "Factory — Peenya Industrial Area", lat: 13.0298, lng: 77.518, geofenceRadiusMeters: 300 },
  });

  const manager = await prisma.employee.create({
    data: { partnerId, name: "Suresh Nair", designation: "Production Manager", department: "Production", joiningDate: daysAgoDate(400), status: "Active", contact: "9999920001", email: "suresh.nair@demomfg.in" },
  });
  const emp2 = await prisma.employee.create({
    data: { partnerId, name: "Ravi Kumar", designation: "Line Supervisor", department: "Production", reportingManagerId: manager.id, joiningDate: daysAgoDate(300), status: "Active", contact: "9999920002" },
  });
  const emp3 = await prisma.employee.create({
    data: { partnerId, name: "Meena Iyer", designation: "QC Inspector", department: "Quality", reportingManagerId: manager.id, joiningDate: daysAgoDate(200), status: "Active", contact: "9999920003" },
  });

  for (const emp of [manager, emp2, emp3]) {
    await prisma.leaveBalance.createMany({
      data: [
        { employeeId: emp.id, leaveType: "Casual", totalDays: 12, usedDays: 3 },
        { employeeId: emp.id, leaveType: "Sick", totalDays: 8, usedDays: 1 },
      ],
    });
    for (let d = 1; d <= 5; d++) {
      await prisma.attendanceCheckIn.create({
        data: {
          employeeId: emp.id,
          checkInAt: daysAgoDate(d),
          checkOutAt: new Date(daysAgoDate(d).getTime() + 8 * 3600000),
          checkInLat: office.lat,
          checkInLng: office.lng,
          status: "Present",
        },
      });
    }
    await prisma.payslip.create({
      data: { employeeId: emp.id, month: new Date().getMonth() === 0 ? 12 : new Date().getMonth(), year: new Date().getFullYear(), basicPay: 3500000, allowances: 500000, deductions: 200000, netPay: 3800000, status: "Paid" },
    });
  }

  await prisma.leaveRequest.create({
    data: { employeeId: emp2.id, leaveType: "Casual", startDate: daysAgoDate(-3), endDate: daysAgoDate(-2), status: "Pending", reason: "Family function" },
  });

  console.log("HRMS: 1 office location, 3 employees, attendance/leave/payslip data seeded.");
}

async function seedMarketplace(partnerId: string) {
  const existing = await prisma.marketplaceListing.count({ where: { partnerId } });
  if (existing > 0) return;

  await prisma.marketplaceVendor.upsert({
    where: { partnerId },
    create: { partnerId, isActive: true },
    update: { isActive: true },
  });

  const listing1 = await prisma.marketplaceListing.create({
    data: { partnerId, title: "Steel Office Chair — Model SC-100 (Bulk)", description: "Minimum order 50 units.", price: 320000, stockQuantity: 400, category: "Furniture", isActive: true },
  });
  const listing2 = await prisma.marketplaceListing.create({
    data: { partnerId, title: "Folding Table — Model FT-220", description: "Ready stock, ships in 3 days.", price: 450000, stockQuantity: 90, category: "Furniture", isActive: true },
  });

  await prisma.marketplaceOrder.createMany({
    data: [
      { partnerId, listingId: listing1.id, customerName: "Bright Interiors Pvt Ltd", customerContact: "9876500001", quantity: 100, totalAmount: 32000000, status: "Delivered", orderedAt: daysAgoDate(20) },
      { partnerId, listingId: listing2.id, customerName: "Urban Office Solutions", customerContact: "9876500002", quantity: 20, totalAmount: 9000000, status: "Shipped", orderedAt: daysAgoDate(4) },
      { partnerId, listingId: listing1.id, customerName: "Metro Coworks", customerContact: "9876500003", quantity: 50, totalAmount: 16000000, status: "Pending", orderedAt: daysAgoDate(1) },
    ],
  });

  console.log("Marketplace: vendor row + 2 listings + 3 orders seeded.");
}

async function seedAccounting(partnerId: string) {
  const existing = await prisma.chartOfAccount.count({ where: { partnerId } });
  if (existing > 0) return;

  const sales = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "4000", accountName: "Sales Revenue", accountType: "Income" } });
  const cash = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "1000", accountName: "Cash & Bank", accountType: "Asset" } });
  const rawMaterial = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "5000", accountName: "Raw Material Purchases", accountType: "Expense" } });
  const payable = await prisma.chartOfAccount.create({ data: { partnerId, accountCode: "2000", accountName: "Accounts Payable", accountType: "Liability" } });

  const je1 = await prisma.journalEntry.create({
    data: { partnerId, entryNumber: "JE-DEMO-0001", entryDate: daysAgoDate(11), narration: "Sale of 200 chairs — Production Order completed", sourceType: "ProductionOrder" },
  });
  await prisma.journalLine.createMany({
    data: [
      { journalEntryId: je1.id, accountId: cash.id, debit: 6400000, credit: 0 },
      { journalEntryId: je1.id, accountId: sales.id, debit: 0, credit: 6400000 },
    ],
  });

  const je2 = await prisma.journalEntry.create({
    data: { partnerId, entryNumber: "JE-DEMO-0002", entryDate: daysAgoDate(25), narration: "Raw material purchase — steel frames", sourceType: "Purchase" },
  });
  await prisma.journalLine.createMany({
    data: [
      { journalEntryId: je2.id, accountId: rawMaterial.id, debit: 1700000, credit: 0 },
      { journalEntryId: je2.id, accountId: payable.id, debit: 0, credit: 1700000 },
    ],
  });

  const now = new Date();
  await prisma.fiscalPeriod.create({
    data: { partnerId, name: `FY ${now.getFullYear()}-${now.getFullYear() + 1}`, startDate: new Date(now.getFullYear(), 3, 1), endDate: new Date(now.getFullYear() + 1, 2, 31), isClosed: false },
  });

  console.log("Accounting: 4 chart-of-accounts rows, 2 journal entries, 1 fiscal period seeded.");
}

async function main() {
  const { partner, alreadyExisted } = await ensureDemoVerticalPartner({
    id: DEMO_ID,
    partnerTypeId: "manufacturing",
    businessName: "Demo Manufacturing Works",
    addressLine: "Plot 14, Peenya Industrial Area",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560058",
    loginContact: LOGIN_CONTACT,
    businessEmail: "demo.manufacturing@mybizflow.in",
  });
  console.log(alreadyExisted ? `Partner "${partner.id}" already existed.` : `Created partner "${partner.id}".`);

  await seedManufacturing(partner.id);
  await seedHrms(partner.id);
  await seedMarketplace(partner.id);
  await seedAccounting(partner.id);

  console.log("\nDemo Manufacturing partner ready:");
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
