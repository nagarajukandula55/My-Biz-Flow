/**
 * Creates (or confirms) a standalone DEMO partner account, fully populated
 * with realistic dummy data across Service Centre / Inventory / Billing —
 * for giving demos to prospective partners or testing features, without
 * touching any real partner's data or numbering.
 *
 * Shared by scripts/create-demo-partner.ts (run locally against a real
 * DATABASE_URL) and src/app/api/admin/seed-demo-partner/route.ts (run this
 * on the deployed app itself, for when the operator's own machine/network
 * can't reach the database directly — same logic, two ways to trigger it).
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
 * Safe to re-run: if a partner with id "DEMO0001" already exists, exits
 * without creating a duplicate or re-seeding data on top of it.
 */
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";
import { createBusinessRecord } from "@/lib/businessRecords";
import { issueAccessKey } from "@/lib/designer/accessKeys";

export const DEMO_PARTNER_ID = "DEMO0001";
export const DEMO_LOGIN_CONTACT = "9999900000";
export const DEMO_PASSWORD = "DemoPartner@123";
const DEMO_PARTNER_TYPE_ID = "service-centre"; // real PartnerType — see scripts/seed-launch-data.ts

async function ensureDemoPartner() {
  const existing = await prisma.partner.findUnique({ where: { id: DEMO_PARTNER_ID } });
  if (existing) return existing;

  const partnerType = await prisma.partnerType.findUnique({ where: { id: DEMO_PARTNER_TYPE_ID } });
  if (!partnerType) {
    throw new Error(
      `PartnerType "${DEMO_PARTNER_TYPE_ID}" not found — run scripts/seed-launch-data.ts first, or change DEMO_PARTNER_TYPE_ID in src/lib/demoPartnerSeed.ts to a real PartnerType id.`
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
    await issueAccessKey(partner.id, slug, "Demo partner — issued by demoPartnerSeed.ts");
  }

  return partner;
}

async function seedIfEmpty(moduleSlug: string, rows: Record<string, unknown>[]) {
  const existing = await prisma.businessRecord.count({ where: { partnerId: DEMO_PARTNER_ID, moduleSlug } });
  if (existing > 0) return;
  for (const row of rows) {
    await createBusinessRecord(DEMO_PARTNER_ID, moduleSlug, row);
  }
}

async function seedDummyData() {
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

  // Field names here must match what the live Inventory (Stock) pages and
  // every stock-consuming action actually read/write (materialId,
  // warehouseName, qtyOnHand — see src/lib/sample-data/warehouse.ts and
  // src/lib/inventoryStock.ts) — this used to seed a completely different,
  // unused shape (itemName/warehouseLocation/quantityOnHand/unitCost/
  // stockStatus) that the real Stock UI never read.
  // BOM (Material Catalog) — the parts these workorders/consumption/return
  // rows below all reference by materialId "CODE — Description" (matches
  // materialCode()'s " — " split convention, same shape as bomRows in
  // src/lib/sample-data/bom.ts, but with this partner's own ids since
  // getBomOptionsForPartner reads real inventory-bom records, not bomRows).
  await seedIfEmpty("inventory-bom", [
    { id: "MAT-D001", description: "Samsung Galaxy M14 Display Assembly", barcode: "8901234601001", hsnCode: "8529", type: "Spare Part", uom: "pcs", rate: 1800, rateType: "Without Tax", taxPercent: 18, mrp: 2400, serialized: false, category: "Display", status: "Active", brandName: "Samsung", modelName: "Galaxy M14", reorderLevel: "3" },
    { id: "MAT-D002", description: "iPhone 13 Battery", barcode: "8901234601002", hsnCode: "8507", type: "Spare Part", uom: "pcs", rate: 1400, rateType: "Without Tax", taxPercent: 18, mrp: 1900, serialized: true, category: "Battery", status: "Active", brandName: "Apple", modelName: "iPhone 13", reorderLevel: "3" },
    { id: "MAT-D003", description: "USB-C Charging Port Flex Cable", barcode: "8901234601003", hsnCode: "8544", type: "Spare Part", uom: "pcs", rate: 180, rateType: "Without Tax", taxPercent: 18, mrp: 320, serialized: false, category: "Connector", status: "Active", reorderLevel: "5" },
    { id: "MAT-D004", description: "Redmi Note 12 Display Assembly", barcode: "8901234601004", hsnCode: "8529", type: "Spare Part", uom: "pcs", rate: 950, rateType: "Without Tax", taxPercent: 18, mrp: 1350, serialized: false, category: "Display", status: "Active", brandName: "Xiaomi", modelName: "Redmi Note 12", reorderLevel: "3" },
    { id: "MAT-D005", description: "Laptop RAM 8GB DDR4", barcode: "8901234601005", hsnCode: "8473", type: "Spare Part", uom: "pcs", rate: 1600, rateType: "Without Tax", taxPercent: 18, mrp: 2100, serialized: false, category: "Memory", status: "Active", reorderLevel: "2" },
    { id: "MAT-D006", description: "Isopropyl Alcohol Cleaning Solution — 500ml", barcode: "8901234601006", hsnCode: "3926", type: "Consumable", uom: "ltr", rate: 220, rateType: "With Tax", taxPercent: 12, mrp: 280, serialized: false, category: "Consumable", status: "Active" },
  ]);

  await seedIfEmpty("inventory-warehouses", [
    { id: "WH-D001", name: "Main Warehouse — Hyderabad", type: "Central", address: "12 Demo Street, Sample Layout", pincode: "500081", state: "Telangana", city: "Hyderabad", contactPerson: "Suresh Kumar", contactPhone: "9999900001", status: "Active" },
    { id: "WH-D002", name: "Local Store — Secunderabad", type: "Local", address: "45 SP Road", pincode: "500003", state: "Telangana", city: "Secunderabad", contactPerson: "Lakshmi Devi", contactPhone: "9999900002", status: "Active" },
  ]);

  await seedIfEmpty("inventory-stock", [
    { id: "INV0001", materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly", warehouseName: "Main Warehouse — Hyderabad", qtyOnHand: 8, reservedQty: 0, availableQty: 8, reorderLevel: 3, condition: "Good" },
    { id: "INV0002", materialId: "MAT-D002 — iPhone 13 Battery", warehouseName: "Main Warehouse — Hyderabad", qtyOnHand: 2, reservedQty: 0, availableQty: 2, reorderLevel: 3, condition: "Good" },
    { id: "INV0003", materialId: "MAT-D003 — USB-C Charging Port Flex Cable", warehouseName: "Main Warehouse — Hyderabad", qtyOnHand: 15, reservedQty: 0, availableQty: 15, reorderLevel: 5, condition: "Good" },
    { id: "INV0004", materialId: "MAT-D004 — Redmi Note 12 Display Assembly", warehouseName: "Local Store — Secunderabad", qtyOnHand: 6, reservedQty: 0, availableQty: 6, reorderLevel: 3, condition: "Good" },
    { id: "INV0005", materialId: "MAT-D005 — Laptop RAM 8GB DDR4", warehouseName: "Main Warehouse — Hyderabad", qtyOnHand: 4, reservedQty: 0, availableQty: 4, reorderLevel: 2, condition: "Good" },
    { id: "INV0006", materialId: "MAT-D002 — iPhone 13 Battery", warehouseName: "Main Warehouse — Hyderabad", qtyOnHand: 1, reservedQty: 0, availableQty: 1, reorderLevel: 3, condition: "Defective" },
    { id: "INV0007", materialId: "MAT-D006 — Isopropyl Alcohol Cleaning Solution — 500ml", warehouseName: "Local Store — Secunderabad", qtyOnHand: 12, reservedQty: 0, availableQty: 12, reorderLevel: 4, condition: "Good" },
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

  // Inquiries logged before a workorder exists — spans Open/Converted/Closed
  // so the Inquiries list and its dashboard summary both have something to
  // show. Field names match inquiryFormFields/inquiryColumns in
  // src/lib/sample-data/service-centre-inquiry.ts.
  await seedIfEmpty("service-centre-inquiry", [
    {
      id: "INQ-DEMO-0001",
      customerName: "Kavitha Rao",
      customerPhone: "9876543220",
      serviceType: "WALK_IN",
      complaint: "Phone screen flickering intermittently",
      brand: "Samsung",
      model: "Galaxy M14",
      pincode: "500081",
      city: "Hyderabad",
      state: "Telangana",
      source: "Staff",
      status: "Open",
      createdAt: `${daysAgo(0)}T10:15:00`,
    },
    {
      id: "INQ-DEMO-0002",
      customerName: "Vikram Singh",
      customerPhone: "9876543221",
      serviceType: "ONSITE",
      complaint: "Laptop not booting up, suspects RAM issue",
      brand: "HP",
      model: "Pavilion 15",
      pincode: "500081",
      city: "Hyderabad",
      state: "Telangana",
      source: "Public Booking",
      status: "Converted",
      createdAt: `${daysAgo(4)}T09:30:00`,
      convertedToWorkorderId: "SC-DEMO-0002",
      convertedAt: `${daysAgo(3)}T11:00:00`,
    },
    {
      id: "INQ-DEMO-0003",
      customerName: "Fathima Begum",
      customerPhone: "9876543222",
      serviceType: "WALK_IN",
      complaint: "Wants quote for battery replacement",
      brand: "Apple",
      model: "iPhone 13",
      pincode: "500003",
      city: "Secunderabad",
      state: "Telangana",
      source: "Staff",
      status: "Closed",
      createdAt: `${daysAgo(8)}T14:00:00`,
      closeReason: "Price declined",
      closedAt: `${daysAgo(7)}T16:00:00`,
    },
  ]);

  // Stock Adjustments — a couple of rows against the demo BOM/warehouses above.
  await seedIfEmpty("inventory-stock-adjustments", [
    {
      id: "ADJ-DEMO-0001",
      warehouseName: "Main Warehouse — Hyderabad",
      materialId: "MAT-D002 — iPhone 13 Battery",
      adjustmentType: "Decrease",
      quantity: 1,
      reason: "Damaged",
      adjustedBy: "Suresh Kumar",
      date: daysAgo(6),
    },
    {
      id: "ADJ-DEMO-0002",
      warehouseName: "Main Warehouse — Hyderabad",
      materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly",
      adjustmentType: "Increase",
      quantity: 10,
      reason: "Initial Stock",
      adjustedBy: "Suresh Kumar",
      date: daysAgo(20),
    },
  ]);

  // Return Orders — Inbound and Outbound, spanning Pending/In Transit/
  // Received/Dispatched, each with a real stageHistory (ReturnOrderStageHistoryEntry[])
  // matching the shape actions.ts writes, not just a bare status string.
  await seedIfEmpty("inventory-return-orders", [
    {
      id: "RTN-DEMO-0001",
      direction: "Inbound",
      workorderRef: "SC-DEMO-0002",
      returnType: "Defective",
      materialId: "MAT-D002 — iPhone 13 Battery",
      quantity: 1,
      sourceLocation: "Demo Service Centre",
      destinationWarehouseName: "Main Warehouse — Hyderabad",
      status: "Pending",
      createdDate: daysAgo(2),
      receivedDate: null,
      stageHistory: [{ at: `${daysAgo(2)}T10:00:00`, stage: "Pending", actor: "Service Centre" }],
    },
    {
      id: "RTN-DEMO-0002",
      direction: "Inbound",
      workorderRef: "SC-DEMO-0006",
      returnType: "Good",
      materialId: "MAT-D004 — Redmi Note 12 Display Assembly",
      quantity: 1,
      sourceLocation: "Demo Service Centre",
      destinationWarehouseName: "Local Store — Secunderabad",
      status: "In Transit",
      createdDate: daysAgo(3),
      receivedDate: null,
      stageHistory: [
        { at: `${daysAgo(3)}T10:00:00`, stage: "Pending", actor: "Service Centre" },
        { at: `${daysAgo(2)}T15:00:00`, stage: "In Transit", actor: "Service Centre" },
      ],
    },
    {
      id: "RTN-DEMO-0003",
      direction: "Inbound",
      workorderRef: "SC-DEMO-0004",
      returnType: "Good",
      materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly",
      quantity: 2,
      sourceLocation: "Demo Service Centre",
      destinationWarehouseName: "Main Warehouse — Hyderabad",
      status: "Received",
      createdDate: daysAgo(9),
      receivedDate: daysAgo(7),
      stageHistory: [
        { at: `${daysAgo(9)}T10:00:00`, stage: "Pending", actor: "Service Centre" },
        { at: `${daysAgo(8)}T12:00:00`, stage: "In Transit", actor: "Service Centre" },
        { at: `${daysAgo(7)}T09:00:00`, stage: "Received", actor: "Warehouse" },
      ],
    },
    {
      id: "RTN-DEMO-0004",
      direction: "Outbound",
      returnType: "Defective",
      materialId: "MAT-D002 — iPhone 13 Battery",
      quantity: 1,
      sourceLocation: "Main Warehouse — Hyderabad",
      vendorName: "Li-ion Battery Distributors Pvt Ltd",
      challanNumber: "CHN-DEMO-0001",
      status: "Dispatched",
      createdDate: daysAgo(5),
      stageHistory: [
        { at: `${daysAgo(5)}T10:00:00`, stage: "Pending", actor: "Warehouse" },
        { at: `${daysAgo(4)}T11:00:00`, stage: "Dispatched", actor: "Warehouse" },
      ],
    },
  ]);

  // Part Orders — Warehouse dispatching replacement material to a Service
  // Centre location, one linked to a Return Order above, one standalone.
  await seedIfEmpty("inventory-part-orders", [
    {
      id: "PO-DEMO-0001",
      linkedReturnOrderId: "RTN-DEMO-0001",
      materialId: "MAT-D002 — iPhone 13 Battery",
      quantity: 1,
      sourceWarehouseName: "Main Warehouse — Hyderabad",
      destinationLocation: "Demo Service Centre",
      status: "Dispatched",
      dispatchedDate: daysAgo(1),
      deliveredDate: null,
    },
    {
      id: "PO-DEMO-0002",
      linkedReturnOrderId: null,
      materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly",
      quantity: 5,
      sourceWarehouseName: "Main Warehouse — Hyderabad",
      destinationLocation: "Demo Service Centre",
      status: "Delivered",
      dispatchedDate: daysAgo(18),
      deliveredDate: daysAgo(16),
    },
  ]);

  // Parts Consumption — real per-workorder deduction history (normally only
  // ever written by a workorder closing), matching consumptionColumns in
  // src/lib/sample-data/consumption.ts, so Part Planning's forecast has
  // something to project from instead of an empty state.
  await seedIfEmpty("inventory-consumption", [
    {
      id: "CONS-DEMO-0001",
      workorderId: "SC-DEMO-0003",
      materialId: "MAT-D003",
      materialLabel: "USB-C Charging Port Flex Cable",
      qty: 1,
      warehouseName: "Main Warehouse — Hyderabad",
      serial: "",
      customerName: "Sri Lakshmi Mobile Care",
      consumedDate: daysAgo(1),
    },
    {
      id: "CONS-DEMO-0002",
      workorderId: "SC-DEMO-0004",
      materialId: "MAT-D001",
      materialLabel: "Samsung Galaxy M14 Display Assembly",
      qty: 1,
      warehouseName: "Main Warehouse — Hyderabad",
      serial: "",
      customerName: "Anitha Reddy",
      consumedDate: daysAgo(7),
    },
    {
      id: "CONS-DEMO-0003",
      workorderId: "SC-DEMO-0005",
      materialId: "MAT-D005",
      materialLabel: "Laptop RAM 8GB DDR4",
      qty: 1,
      warehouseName: "Main Warehouse — Hyderabad",
      serial: "",
      customerName: "Mohammed Irfan",
      consumedDate: daysAgo(12),
    },
  ]);
}

export async function createDemoPartner(): Promise<{ partnerId: string; loginContact: string; password: string; alreadyExisted: boolean }> {
  const before = await prisma.partner.findUnique({ where: { id: DEMO_PARTNER_ID } });
  const partner = await ensureDemoPartner();
  await seedDummyData();
  return { partnerId: partner.id, loginContact: DEMO_LOGIN_CONTACT, password: DEMO_PASSWORD, alreadyExisted: Boolean(before) };
}
