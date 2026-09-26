/**
 * Creates (or confirms) a standalone DEMO POS partner account, fully
 * populated with realistic dummy data: a PosAccount, a couple of PosStaff
 * logins, some recent + historical PosTillSession rows, some inventory-stock
 * BusinessRecords for the SKUs sold, and some completed pos BusinessRecord
 * sales (+ matching Billing invoices), plus the cross-cutting Inventory
 * module this session's seed-pos-partner-type.ts bundles by default.
 *
 * Unlike the 5 new-vertical demo scripts (Manufacturing/Wholesale
 * B2B/Event Booking/Legal/Education), POS's account/staff/till-session
 * layer is real dedicated Prisma (PosAccount/PosStaff/PosTillSession — see
 * prisma/schema.prisma) but the actual SALE records themselves are still
 * BusinessRecord-backed under the "pos" module slug, same as every other
 * module's transactional records (confirmed by reading
 * src/app/partner/[partnerId]/pos/checkout/actions.ts — completeSaleAction
 * creates a BusinessRecord under moduleSlug "pos" plus a linked "billing"
 * BusinessRecord invoice; it does not touch any dedicated "Sale" Prisma
 * table because none exists). So this script uses ensureDemoVerticalPartner
 * (src/lib/demoNewVerticalsShared.ts) for the Partner-creation boilerplate
 * exactly like the other 5, then seeds POS's real Prisma tables directly
 * PLUS calls createBusinessRecord (src/lib/businessRecords.ts) for the
 * inventory-stock and pos/billing rows — mirroring exactly what
 * completeSaleAction/voidSaleAction do at runtime, without going through
 * the staff-session-gated Server Actions themselves (this is a seed script,
 * not a browser session, so there is no POS staff cookie to satisfy
 * requirePosStaffAction — the sale rows are inserted directly with the same
 * shape completeSaleAction produces instead).
 *
 * Deliberately separate from src/lib/demoPartnerSeed.ts (Service Centre
 * DEMO0001) and from demoNewVerticalsShared.ts's 5 new-vertical seeders —
 * neither is touched by this script.
 *
 * Demo id: "DEMO-POS0001" (never a real "POS####" id, so nextPartnerId()'s
 * per-prefix count in src/lib/partnerData.ts is never inflated — same
 * reasoning as the other 5 demo scripts).
 * Login contact: 9999910006 / password: DemoPartner@123 (main partner
 * login), no OTP, mustChangePassword false.
 * POS staff logins (separate credential — see src/lib/pos/posAuth.ts):
 *   staffCode "POS0001-01" (Manager, Priya Nair) / password: DemoPos@123
 *   staffCode "POS0001-02" (Cashier, Suresh Babu) / password: DemoPos@123
 *
 * Requires scripts/seed-pos-partner-type.ts to have been run first (the
 * "pos" PartnerType row must exist) — ensureDemoVerticalPartner throws a
 * clear error otherwise.
 *
 * Idempotent — every insert is guarded by an existence check, safe to
 * re-run. Does NOT run any prisma migrate/db push and does NOT touch
 * prisma/schema.prisma, prisma/migrations/, or any other seed script.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/seed-demo-pos.ts
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/passwords";
import { createBusinessRecord } from "../src/lib/businessRecords";
import { computeSaleTotals, type SaleLine, type Tender } from "../src/lib/sample-data/pos";
import { ensureDemoVerticalPartner, mulberry32, daysAgoDate, DEMO_PASSWORD } from "../src/lib/demoNewVerticalsShared";

const DEMO_ID = "DEMO-POS0001";
const LOGIN_CONTACT = "9999910006";
const POS_STAFF_PASSWORD = "DemoPos@123";

const SKUS = [
  { sku: "SKU-SOAP01", productName: "Herbal Soap 100g", unitPrice: 45, taxRate: 18, startQty: 200 },
  { sku: "SKU-SNK01", productName: "Salted Chips 150g", unitPrice: 30, taxRate: 12, startQty: 150 },
  { sku: "SKU-BEV01", productName: "Cola 500ml", unitPrice: 40, taxRate: 12, startQty: 180 },
  { sku: "SKU-STA01", productName: "Notebook 200pg", unitPrice: 60, taxRate: 5, startQty: 120 },
  { sku: "SKU-HH01", productName: "Dish Wash Liquid 500ml", unitPrice: 95, taxRate: 18, startQty: 90 },
];

async function seedInventoryStock(partnerId: string) {
  const existing = await prisma.businessRecord.count({ where: { partnerId, moduleSlug: "inventory-stock" } });
  if (existing > 0) {
    console.log("Inventory stock already seeded — skipping.");
    return;
  }
  for (const item of SKUS) {
    await createBusinessRecord(partnerId, "inventory-stock", {
      id: item.sku,
      materialId: item.sku,
      warehouseName: "Store Counter",
      condition: "Good",
      qtyOnHand: item.startQty,
      reservedQty: 0,
      availableQty: item.startQty,
      reorderLevel: 20,
      serialized: false,
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }
  console.log(`Inventory stock: ${SKUS.length} SKUs seeded.`);
}

async function seedPosAccount(partnerId: string) {
  const existing = await prisma.posAccount.findUnique({ where: { partnerId } });
  if (existing) {
    console.log("POS account already seeded — skipping account/staff/till.");
    return existing;
  }

  const account = await prisma.posAccount.create({
    data: { partnerId, accountNumber: "POS0001", outletName: "Demo Retail Counter", status: "Active" },
  });

  const manager = await prisma.posStaff.create({
    data: {
      posAccountId: account.id,
      staffCode: "POS0001-01",
      name: "Priya Nair",
      phone: "9999920031",
      role: "Manager",
      passwordHash: hashPassword(POS_STAFF_PASSWORD),
      status: "Active",
    },
  });
  const cashier = await prisma.posStaff.create({
    data: {
      posAccountId: account.id,
      staffCode: "POS0001-02",
      name: "Suresh Babu",
      phone: "9999920032",
      role: "Cashier",
      passwordHash: hashPassword(POS_STAFF_PASSWORD),
      status: "Active",
    },
  });

  const locationId = "main-outlet";

  // A closed till session from yesterday (reconciled, small variance) and
  // today's currently-Open session, matching the two states PosTillSession
  // actually models (see prisma/schema.prisma's status Open|Closed).
  await prisma.posTillSession.create({
    data: {
      posAccountId: account.id,
      locationId,
      openedByStaffId: cashier.id,
      openingFloat: 200000, // paise-free integer amount, ₹2000 float
      openedAt: daysAgoDate(1),
      closedByStaffId: manager.id,
      countedCash: 486000,
      expectedCash: 485000,
      variance: 1000,
      closedAt: new Date(daysAgoDate(1).getTime() + 9 * 3600000),
      status: "Closed",
      notes: "End of day — ₹10 over, within tolerance.",
    },
  });

  const openSession = await prisma.posTillSession.create({
    data: {
      posAccountId: account.id,
      locationId,
      openedByStaffId: cashier.id,
      openingFloat: 200000,
      openedAt: new Date(Date.now() - 2 * 3600000),
      status: "Open",
    },
  });

  console.log("POS account: 1 account, 2 staff (Manager/Cashier), 1 closed + 1 open till session seeded.");
  return { account, manager, cashier, openSession, locationId };
}

async function seedSales(partnerId: string, cashierName: string, cashierCode: string, tillSessionId: string, locationId: string) {
  const existing = await prisma.businessRecord.count({ where: { partnerId, moduleSlug: "pos" } });
  if (existing > 0) {
    console.log("POS sales already seeded — skipping.");
    return;
  }

  const rng = mulberry32(20260925);
  const tenderMethods: Tender["method"][] = ["Cash", "UPI", "Card", "Wallet"];

  async function ringUpSale(ageDays: number, lineCount: number, voided: boolean) {
    const lines: SaleLine[] = [];
    for (let i = 0; i < lineCount; i++) {
      const item = SKUS[Math.floor(rng() * SKUS.length)];
      lines.push({
        id: `L${i + 1}`,
        sku: item.sku,
        productName: item.productName,
        qty: 1 + Math.floor(rng() * 3),
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discount: 0,
      });
    }
    const totals = computeSaleTotals(lines);
    const tender: Tender = { method: tenderMethods[Math.floor(rng() * tenderMethods.length)], amount: totals.totalAmount };
    const timestamp = daysAgoDate(ageDays).toISOString();

    const sale = await createBusinessRecord(partnerId, "pos", {
      status: voided ? "Voided" : "Completed",
      lines,
      lineCount: lines.length,
      ...totals,
      tenders: [tender],
      amountTendered: totals.totalAmount,
      changeDue: 0,
      cashier: `${cashierName} (${cashierCode})`,
      branch: "Demo Retail Counter",
      locationId,
      posTillSessionId: tillSessionId,
      stockDeducted: !voided,
      paymentSummary: tender.method,
      transactionTimestamp: timestamp,
      ...(voided ? { voidedAt: timestamp, voidReason: "Demo voided sale" } : {}),
    });

    if (!voided) {
      const invoice = await createBusinessRecord(partnerId, "billing", {
        customer: "Walk-in Customer",
        issueDate: timestamp.slice(0, 10),
        dueDate: timestamp.slice(0, 10),
        lineItemsSummary: lines.map((l) => `${l.productName} x${l.qty}`).join(", "),
        items: lines.map((l) => ({
          description: l.productName,
          quantity: l.qty,
          unit: "pcs",
          unitPrice: l.unitPrice,
          taxRate: l.taxRate,
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        paymentStatus: "Paid",
        paymentMode: tender.method,
        sourcePosSaleId: sale.id,
        invoiceSource: "POS Sale",
      });
      await prisma.businessRecord.update({
        where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "pos", recordKey: String(sale.id) } },
        data: { data: { ...(sale as Record<string, unknown>), invoiceId: invoice.id } },
      });
    }
  }

  // A handful of recent sales (today/yesterday) + a historical tail so
  // reports/lists have real shape to show, same pattern as the other demo
  // scripts' "5 recent + N historical" split.
  await ringUpSale(0, 2, false);
  await ringUpSale(0, 1, false);
  await ringUpSale(1, 3, false);
  await ringUpSale(1, 1, true); // a voided sale for the report/void flow to show
  await ringUpSale(2, 2, false);

  for (let i = 0; i < 25; i++) {
    const ageDays = 3 + Math.floor(rng() * 60);
    const lineCount = 1 + Math.floor(rng() * 4);
    const voided = rng() < 0.08;
    await ringUpSale(ageDays, lineCount, voided);
  }

  console.log("POS sales: 5 recent + 25 historical BusinessRecord sales seeded (with matching Billing invoices for completed ones).");
}

async function main() {
  const { partner, alreadyExisted } = await ensureDemoVerticalPartner({
    id: DEMO_ID,
    partnerTypeId: "pos",
    businessName: "Demo Retail Counter",
    addressLine: "Shop 4, Commercial Complex",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    loginContact: LOGIN_CONTACT,
    businessEmail: "demo.pos@mybizflow.in",
  });
  console.log(alreadyExisted ? `Partner "${partner.id}" already existed.` : `Created partner "${partner.id}".`);

  await seedInventoryStock(partner.id);
  const posSeed = await seedPosAccount(partner.id);

  if (posSeed && "openSession" in posSeed) {
    await seedSales(partner.id, posSeed.cashier.name, posSeed.cashier.staffCode, posSeed.openSession.id, posSeed.locationId);
  } else {
    // POS account already existed from a prior run — look up what we need
    // to seed sales idempotently without recreating account/staff/till.
    const account = await prisma.posAccount.findUniqueOrThrow({ where: { partnerId: partner.id } });
    const cashier = await prisma.posStaff.findFirstOrThrow({ where: { posAccountId: account.id, role: "Cashier" } });
    const openSession = await prisma.posTillSession.findFirstOrThrow({ where: { posAccountId: account.id, status: "Open" } });
    await seedSales(partner.id, cashier.name, cashier.staffCode, openSession.id, openSession.locationId);
  }

  console.log("\nDemo POS partner ready:");
  console.log(`  Partner ID: ${partner.id}`);
  console.log(`  Main login contact: ${LOGIN_CONTACT} / password: ${DEMO_PASSWORD}`);
  console.log(`  POS staff logins: POS0001-01 (Manager, Priya Nair), POS0001-02 (Cashier, Suresh Babu) / password: ${POS_STAFF_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
