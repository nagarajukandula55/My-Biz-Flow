/**
 * Creates a standalone DEMO partner account, fully populated with realistic
 * dummy data across Service Centre / Inventory / Billing — for giving demos
 * to prospective partners or testing features, without touching any real
 * partner's data or numbering.
 *
 * Deliberately does NOT call createPartner()/nextPartnerId() — those derive
 * the next sequential "<prefix>####" id by COUNTING existing partners whose
 * id starts with that same prefix (see src/lib/partnerData.ts). Creating a
 * demo partner under a real prefix (e.g. "SC") would inflate that count by
 * one, silently shifting every subsequent REAL signup's number. Instead
 * this uses its own "DEMO" prefix (id "DEMO0001") that no real PartnerType
 * uses, so it can never collide with or shift a real partner's number.
 *
 * subscriptionStatus is set to "Trial" with a trialEndAt 100 years out —
 * reuses the existing "a Trial partner gets the top tier of their type's
 * plan ladder automatically" rule (src/lib/tenant.ts's getPageTierAccess)
 * so this demo account shows every Pro/Ultimate feature with zero extra
 * plan/billing wiring, and never expires.
 *
 * Login is fixed (not the usual random-generated-password flow) and
 * mustChangePassword is false, so it's immediately usable to hand to
 * someone for a demo without an extra password-setup step.
 *
 * Usage: DATABASE_URL=... DATABASE_URL_UNPOOLED=... npx tsx scripts/create-demo-partner.ts
 *
 * Safe to re-run: if a partner with id "DEMO0001" already exists, exits
 * without creating a duplicate or re-seeding data on top of it.
 */
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/passwords";
import { createBusinessRecord } from "../src/lib/businessRecords";
import { issueAccessKey } from "../src/lib/designer/accessKeys";

const DEMO_PARTNER_ID = "DEMO0001";
const DEMO_LOGIN_CONTACT = "9999900000";
const DEMO_PASSWORD = "DemoPartner@123";
const DEMO_PARTNER_TYPE_ID = "service-centre"; // real PartnerType — see scripts/seed-launch-data.ts

async function ensureDemoPartner() {
  const existing = await prisma.partner.findUnique({ where: { id: DEMO_PARTNER_ID } });
  if (existing) {
    console.log(`Partner "${DEMO_PARTNER_ID}" already exists — skipping creation (data seeding below is also idempotent).`);
    return existing;
  }

  const partnerType = await prisma.partnerType.findUnique({ where: { id: DEMO_PARTNER_TYPE_ID } });
  if (!partnerType) {
    throw new Error(
      `PartnerType "${DEMO_PARTNER_TYPE_ID}" not found — run scripts/seed-launch-data.ts first, or change DEMO_PARTNER_TYPE_ID in this script to a real PartnerType id.`
    );
  }

  const now = new Date();
  const trialEndAt = new Date(now);
  trialEndAt.setFullYear(trialEndAt.getFullYear() + 100); // effectively never expires

  const partner = await prisma.partner.create({
    data: {
      id: DEMO_PARTNER_ID,
      internalKey: `BIZ002-${DEMO_PARTNER_ID}`,
      businessId: "BIZ002",
      partnerTypeId: DEMO_PARTNER_TYPE_ID,
      businessName: "Demo Service Centre",
      addressLine: "12 Demo Street, Sample Layout",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      gstin: null,
      businessEmail: "demo@mybizflow.in",
      businessContact: DEMO_LOGIN_CONTACT,
      loginContact: DEMO_LOGIN_CONTACT,
      passwordHash: hashPassword(DEMO_PASSWORD),
      mustChangePassword: false,
      subscriptionStatus: "Trial",
      trialStartAt: now,
      trialEndAt,
    },
  });

  // Module access keys — mirrors what createPartner() does for a real
  // signup (src/lib/partnerData.ts's issueDefaultModuleAccessKeys), called
  // directly here. There's no per-partner Role assignment to mirror: the
  // viewer's role is a hardcoded demo stand-in (getDemoViewerRole() in
  // src/lib/rbac.ts returns "Owner / Admin" for every partner) until real
  // partner-user sessions exist, so nothing to assign here.
  for (const slug of partnerType.defaultModules as string[]) {
    await issueAccessKey(partner.id, slug, "Demo partner — issued by create-demo-partner.ts");
  }

  console.log(`Created partner "${partner.id}" (${partner.businessName}).`);
  return partner;
}

async function seedIfEmpty(moduleSlug: string, rows: Record<string, unknown>[]) {
  const existing = await prisma.businessRecord.count({ where: { partnerId: DEMO_PARTNER_ID, moduleSlug } });
  if (existing > 0) {
    console.log(`  ${moduleSlug}: already has ${existing} record(s) — skipping.`);
    return;
  }
  for (const row of rows) {
    await createBusinessRecord(DEMO_PARTNER_ID, moduleSlug, row);
  }
  console.log(`  ${moduleSlug}: created ${rows.length} record(s).`);
}

async function seedDummyData() {
  console.log("Seeding dummy data...");

  await seedIfEmpty("service-centre-customers", [
    { id: "CUST0001", name: "Priya Sharma", phone: "9876543210", email: "priya.sharma@example.com", city: "Hyderabad", state: "Telangana", status: "Active" },
    { id: "CUST0002", name: "Rahul Verma", phone: "9876543211", email: "rahul.verma@example.com", city: "Secunderabad", state: "Telangana", status: "Active" },
    { id: "CUST0003", name: "Sri Lakshmi Mobile Care", phone: "9876543212", email: "srilakshmi.mobiles@example.com", city: "Hyderabad", state: "Telangana", status: "Active" },
    { id: "CUST0004", name: "Anitha Reddy", phone: "9876543213", email: "anitha.reddy@example.com", city: "Warangal", state: "Telangana", status: "Active" },
    { id: "CUST0005", name: "Mohammed Irfan", phone: "9876543214", email: "irfan.m@example.com", city: "Hyderabad", state: "Telangana", status: "Active" },
  ]);

  await seedIfEmpty("service-centre-brands", [
    { id: "BRD0001", name: "Samsung", domain: ["Mobile"], category: ["Smartphone"], status: "Active" },
    { id: "BRD0002", name: "Apple", domain: ["Mobile"], category: ["Smartphone"], status: "Active" },
    { id: "BRD0003", name: "Xiaomi", domain: ["Mobile"], category: ["Smartphone"], status: "Active" },
    { id: "BRD0004", name: "HP", domain: ["Computer"], category: ["Laptop"], status: "Active" },
  ]);

  await seedIfEmpty("service-centre-models", [
    { id: "MDL0001", brandName: "Samsung", domain: ["Mobile"], name: "Galaxy M14", status: "Active" },
    { id: "MDL0002", brandName: "Apple", domain: ["Mobile"], name: "iPhone 13", status: "Active" },
    { id: "MDL0003", brandName: "Xiaomi", domain: ["Mobile"], name: "Redmi Note 12", status: "Active" },
    { id: "MDL0004", brandName: "HP", domain: ["Computer"], name: "Pavilion 15", status: "Active" },
  ]);

  await seedIfEmpty("service-centre-fault-codes", [
    { id: "FLT0001", description: "Screen not turning on", category: "Display", isActive: "Yes" },
    { id: "FLT0002", description: "Battery draining fast", category: "Battery", isActive: "Yes" },
    { id: "FLT0003", description: "Charging port not working", category: "Charging", isActive: "Yes" },
    { id: "FLT0004", description: "Water damage", category: "General", isActive: "Yes" },
  ]);

  await seedIfEmpty("service-centre-symptom-codes", [
    { id: "SYM0001", description: "Device won't power on", category: "Power", isActive: "Yes" },
    { id: "SYM0002", description: "Overheating during use", category: "Thermal", isActive: "Yes" },
    { id: "SYM0003", description: "Cracked display glass", category: "Display", isActive: "Yes" },
  ]);

  await seedIfEmpty("service-centre-solutions", [
    { id: "SOL0001", title: "Display panel replacement", category: "Hardware", estimatedRepairMinutes: 60, status: "Active" },
    { id: "SOL0002", title: "Battery replacement", category: "Hardware", estimatedRepairMinutes: 30, status: "Active" },
    { id: "SOL0003", title: "Charging port cleaning/repair", category: "Hardware", estimatedRepairMinutes: 45, status: "Active" },
    { id: "SOL0004", title: "Software reset / reflash", category: "Software", estimatedRepairMinutes: 20, status: "Active" },
  ]);

  await seedIfEmpty("inventory-stock", [
    { id: "INV0001", itemName: "Samsung Galaxy M14 Display", warehouseLocation: "Rack A1", quantityOnHand: 8, reorderLevel: 3, unitCost: 2200, stockStatus: "In stock" },
    { id: "INV0002", itemName: "iPhone 13 Battery", warehouseLocation: "Rack A2", quantityOnHand: 2, reorderLevel: 3, unitCost: 1800, stockStatus: "Low stock" },
    { id: "INV0003", itemName: "USB-C Charging Port Flex", warehouseLocation: "Rack B1", quantityOnHand: 15, reorderLevel: 5, unitCost: 350, stockStatus: "In stock" },
    { id: "INV0004", itemName: "Redmi Note 12 Display", warehouseLocation: "Rack A1", quantityOnHand: 6, reorderLevel: 3, unitCost: 1600, stockStatus: "In stock" },
    { id: "INV0005", itemName: "Laptop RAM 8GB DDR4", warehouseLocation: "Rack C1", quantityOnHand: 4, reorderLevel: 2, unitCost: 1900, stockStatus: "In stock" },
  ]);

  const today = new Date();
  const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);

  await seedIfEmpty("service-centre", [
    {
      id: "SC-DEMO-0001",
      customer: "Priya Sharma",
      customerPhone: "9876543210",
      brandName: "Samsung",
      modelName: "Galaxy M14",
      faultDescription: "Screen not turning on",
      stage: "Created",
      status: "Created",
      receivedDate: daysAgo(1),
      warrantyFlag: "No",
      stageHistory: [{ at: daysAgo(1), stage: "Created" }],
    },
    {
      id: "SC-DEMO-0002",
      customer: "Rahul Verma",
      customerPhone: "9876543211",
      brandName: "Apple",
      modelName: "iPhone 13",
      faultDescription: "Battery draining fast",
      stage: "In Progress",
      status: "In Progress",
      receivedDate: daysAgo(3),
      warrantyFlag: "No",
      stageHistory: [
        { at: daysAgo(3), stage: "Created" },
        { at: daysAgo(2), stage: "In Progress" },
      ],
    },
    {
      id: "SC-DEMO-0003",
      customer: "Sri Lakshmi Mobile Care",
      customerPhone: "9876543212",
      brandName: "Xiaomi",
      modelName: "Redmi Note 12",
      faultDescription: "Charging port not working",
      stage: "Completed",
      status: "Completed",
      receivedDate: daysAgo(5),
      warrantyFlag: "No",
      solutionId: "SOL0003",
      solutionLabel: "Charging port cleaning/repair",
      stageHistory: [
        { at: daysAgo(5), stage: "Created" },
        { at: daysAgo(4), stage: "In Progress" },
        { at: daysAgo(1), stage: "Completed" },
      ],
    },
    {
      id: "SC-DEMO-0004",
      customer: "Anitha Reddy",
      customerPhone: "9876543213",
      brandName: "Samsung",
      modelName: "Galaxy M14",
      faultDescription: "Water damage",
      stage: "Closed",
      status: "Closed",
      receivedDate: daysAgo(10),
      warrantyFlag: "No",
      solutionId: "SOL0001",
      solutionLabel: "Display panel replacement",
      stageHistory: [
        { at: daysAgo(10), stage: "Created" },
        { at: daysAgo(9), stage: "In Progress" },
        { at: daysAgo(7), stage: "Completed" },
        { at: daysAgo(6), stage: "Closed" },
      ],
    },
    {
      id: "SC-DEMO-0005",
      customer: "Mohammed Irfan",
      customerPhone: "9876543214",
      brandName: "HP",
      modelName: "Pavilion 15",
      faultDescription: "Overheating during use",
      stage: "Closed",
      status: "Closed",
      receivedDate: daysAgo(15),
      warrantyFlag: "No",
      solutionId: "SOL0004",
      solutionLabel: "Software reset / reflash",
      stageHistory: [
        { at: daysAgo(15), stage: "Created" },
        { at: daysAgo(14), stage: "In Progress" },
        { at: daysAgo(12), stage: "Completed" },
        { at: daysAgo(11), stage: "Closed" },
      ],
    },
    {
      id: "SC-DEMO-0006",
      customer: "Priya Sharma",
      customerPhone: "9876543210",
      brandName: "Xiaomi",
      modelName: "Redmi Note 12",
      faultDescription: "Cracked display glass",
      stage: "In Progress",
      status: "In Progress",
      receivedDate: daysAgo(2),
      warrantyFlag: "No",
      stageHistory: [
        { at: daysAgo(2), stage: "Created" },
        { at: daysAgo(1), stage: "In Progress" },
      ],
    },
  ]);

  await seedIfEmpty("billing", [
    {
      id: "INV-DEMO-0001",
      customer: "Sri Lakshmi Mobile Care",
      invoiceSource: "Service Centre",
      issueDate: daysAgo(1),
      dueDate: daysAgo(1),
      lineItemsSummary: "Charging port cleaning/repair",
      subtotal: 850,
      taxAmount: 153,
      totalAmount: 1003,
      amountPaid: 1003,
      amountDue: 0,
      paymentStatus: "Paid",
      paymentMode: "UPI",
    },
    {
      id: "INV-DEMO-0002",
      customer: "Mohammed Irfan",
      invoiceSource: "Service Centre",
      issueDate: daysAgo(11),
      dueDate: daysAgo(11),
      lineItemsSummary: "Software reset / reflash",
      subtotal: 500,
      taxAmount: 90,
      totalAmount: 590,
      amountPaid: 590,
      amountDue: 0,
      paymentStatus: "Paid",
      paymentMode: "Cash",
    },
    {
      id: "INV-DEMO-0003",
      customer: "Anitha Reddy",
      invoiceSource: "Service Centre",
      issueDate: daysAgo(6),
      dueDate: daysAgo(-4),
      lineItemsSummary: "Display panel replacement",
      subtotal: 2200,
      taxAmount: 396,
      totalAmount: 2596,
      amountPaid: 0,
      amountDue: 2596,
      paymentStatus: "Draft",
      paymentMode: "Bank Transfer",
    },
  ]);
}

async function main() {
  const partner = await ensureDemoPartner();
  await seedDummyData();

  console.log("\nDemo partner ready:");
  console.log(`  Partner ID (login id): ${partner.id}`);
  console.log(`  Login contact: ${DEMO_LOGIN_CONTACT}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Log in at /login. Subscription is a 100-year Trial, so every Pro/Ultimate feature is unlocked with no plan/billing setup needed.`);
}

main()
  .catch((err) => {
    console.error("Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
