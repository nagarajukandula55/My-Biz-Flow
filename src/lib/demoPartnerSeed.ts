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

/**
 * Second, INDEPENDENT seeding pass — spreads a much larger volume of data
 * across roughly the last 90-180 days so weekly/monthly trend charts,
 * ageing buckets, and the Part Planning trailing-30/60/90-day consumption
 * forecast all have a real, varied shape to show instead of a handful of
 * points clustered in the last 15 days (which is all seedDummyData()
 * above provides — deliberately kept small/recent for a "just signed up"
 * demo feel).
 *
 * Gated independently from seedIfEmpty()'s "any row exists" check, via a
 * distinct "<MODULE>-HIST-" recordKey prefix per module — so this can
 * layer on top of a demo partner whose seedDummyData() already ran (and
 * would otherwise be skipped by seedIfEmpty for every module it touches),
 * and is itself safe to re-run: each module's insert loop below is guarded
 * by "do any of MY OWN HIST-prefixed rows already exist for this module",
 * independent of every other module's guard, so a partial prior run can
 * finish without duplicating what already landed.
 */
async function hasHistRows(moduleSlug: string, prefix: string): Promise<boolean> {
  const count = await prisma.businessRecord.count({
    where: { partnerId: DEMO_PARTNER_ID, moduleSlug, recordKey: { startsWith: prefix } },
  });
  return count > 0;
}

/** Small seeded PRNG (mulberry32) — deterministic so re-running the whole route against an already-seeded partner (which no-ops via hasHistRows) never matters, but a single fresh run still gets varied-looking, non-uniform data instead of a suspiciously regular pattern. */
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function ensureHistCatalogExtras() {
  // A couple more brand/model pairs and fault/solution codes purely for
  // variety across ~65 historical workorders — catalogs aren't
  // date-sensitive, so these are safe to add even though the base
  // catalogs' seedIfEmpty() calls above have likely already run.
  if (!(await hasHistRows("service-centre-brands", "BRD-HIST-"))) {
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-brands", { id: "BRD-HIST-0001", name: "OnePlus", domain: ["Mobile"], category: ["Smartphone"], status: "Active" });
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-brands", { id: "BRD-HIST-0002", name: "Dell", domain: ["Computer"], category: ["Laptop"], status: "Active" });
  }

  if (!(await hasHistRows("service-centre-models", "MDL-HIST-"))) {
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-models", { id: "MDL-HIST-0001", brandName: "OnePlus", domain: ["Mobile"], name: "Nord CE3", status: "Active" });
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-models", { id: "MDL-HIST-0002", brandName: "Dell", domain: ["Computer"], name: "Inspiron 15", status: "Active" });
  }

  if (!(await hasHistRows("service-centre-fault-codes", "FLT-HIST-"))) {
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-fault-codes", { id: "FLT-HIST-0001", description: "Speaker not working", category: "Audio", isActive: "Yes" });
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-fault-codes", { id: "FLT-HIST-0002", description: "Camera malfunction", category: "Camera", isActive: "Yes" });
  }

  if (!(await hasHistRows("service-centre-solutions", "SOL-HIST-"))) {
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-solutions", { id: "SOL-HIST-0001", title: "Speaker replacement", category: "Hardware", estimatedRepairMinutes: 40, status: "Active" });
    await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-solutions", { id: "SOL-HIST-0002", title: "Camera module replacement", category: "Hardware", estimatedRepairMinutes: 50, status: "Active" });
  }

  if (!(await hasHistRows("service-centre-customers", "CUST-HIST-"))) {
    const extraCustomers: { id: string; name: string; phone: string; email: string; city: string }[] = [
      { id: "CUST-HIST-0001", name: "Ramesh Chandra", phone: "9876543230", email: "ramesh.chandra@example.com", city: "Hyderabad" },
      { id: "CUST-HIST-0002", name: "Sunita Patel", phone: "9876543231", email: "sunita.patel@example.com", city: "Secunderabad" },
      { id: "CUST-HIST-0003", name: "Farhan Ahmed", phone: "9876543232", email: "farhan.ahmed@example.com", city: "Hyderabad" },
      { id: "CUST-HIST-0004", name: "Deepika Nair", phone: "9876543233", email: "deepika.nair@example.com", city: "Warangal" },
      { id: "CUST-HIST-0005", name: "Vikas Goud", phone: "9876543234", email: "vikas.goud@example.com", city: "Hyderabad" },
      { id: "CUST-HIST-0006", name: "Ayesha Khan", phone: "9876543235", email: "ayesha.khan@example.com", city: "Hyderabad" },
      { id: "CUST-HIST-0007", name: "Naveen Kumar Reddy", phone: "9876543236", email: "naveen.reddy@example.com", city: "Karimnagar" },
      { id: "CUST-HIST-0008", name: "Shalini Rao", phone: "9876543237", email: "shalini.rao@example.com", city: "Secunderabad" },
      { id: "CUST-HIST-0009", name: "Imran Sheikh", phone: "9876543238", email: "imran.sheikh@example.com", city: "Hyderabad" },
      { id: "CUST-HIST-0010", name: "Padma Devi", phone: "9876543239", email: "padma.devi@example.com", city: "Nizamabad" },
    ];
    for (const c of extraCustomers) {
      await createBusinessRecord(DEMO_PARTNER_ID, "service-centre-customers", { id: c.id, name: c.name, phone: c.phone, email: c.email, city: c.city, state: "Telangana", status: "Active" });
    }
  }
}

type HistoricalWorkorder = {
  id: string;
  customer: string;
  customerPhone: string;
  brandName: string;
  modelName: string;
  faultDescription: string;
  stage: "Created" | "In Progress" | "Completed" | "Closed";
  ageDays: number;
  receivedDate: string;
  solutionId?: string;
  solutionLabel?: string;
  closedOffset?: number; // days-ago the workorder reached Completed/Closed — used to date the linked invoice/consumption row a couple of days later
  stageHistory: { at: string; stage: string }[];
};

async function seedHistoricalReportData() {
  await ensureHistCatalogExtras();

  const today = new Date();
  const day = (n: number) => new Date(today.getTime() - n * 86400000).toISOString().slice(0, 10);

  const rng = mulberry32(20260924);

  const customers = [
    { name: "Priya Sharma", phone: "9876543210" },
    { name: "Rahul Verma", phone: "9876543211" },
    { name: "Sri Lakshmi Mobile Care", phone: "9876543212" },
    { name: "Anitha Reddy", phone: "9876543213" },
    { name: "Mohammed Irfan", phone: "9876543214" },
    { name: "Ramesh Chandra", phone: "9876543230" },
    { name: "Sunita Patel", phone: "9876543231" },
    { name: "Farhan Ahmed", phone: "9876543232" },
    { name: "Deepika Nair", phone: "9876543233" },
    { name: "Vikas Goud", phone: "9876543234" },
    { name: "Ayesha Khan", phone: "9876543235" },
    { name: "Naveen Kumar Reddy", phone: "9876543236" },
    { name: "Shalini Rao", phone: "9876543237" },
    { name: "Imran Sheikh", phone: "9876543238" },
    { name: "Padma Devi", phone: "9876543239" },
  ];

  const brandModels = [
    { brand: "Samsung", model: "Galaxy M14" },
    { brand: "Apple", model: "iPhone 13" },
    { brand: "Xiaomi", model: "Redmi Note 12" },
    { brand: "HP", model: "Pavilion 15" },
    { brand: "OnePlus", model: "Nord CE3" },
    { brand: "Dell", model: "Inspiron 15" },
  ];

  // fault/solution pairs kept 1:1 so a completed/closed row's solution
  // always matches its stated fault, same convention seedDummyData() uses.
  const faultSolutionPairs: { fault: string; solutionId: string; solutionLabel: string; materialId: string; materialLabel: string }[] = [
    { fault: "Screen not turning on", solutionId: "SOL0001", solutionLabel: "Display panel replacement", materialId: "MAT-D001", materialLabel: "Samsung Galaxy M14 Display Assembly" },
    { fault: "Battery draining fast", solutionId: "SOL0002", solutionLabel: "Battery replacement", materialId: "MAT-D002", materialLabel: "iPhone 13 Battery" },
    { fault: "Charging port not working", solutionId: "SOL0003", solutionLabel: "Charging port cleaning/repair", materialId: "MAT-D003", materialLabel: "USB-C Charging Port Flex Cable" },
    { fault: "Water damage", solutionId: "SOL0004", solutionLabel: "Software reset / reflash", materialId: "MAT-D006", materialLabel: "Isopropyl Alcohol Cleaning Solution — 500ml" },
    { fault: "Speaker not working", solutionId: "SOL-HIST-0001", solutionLabel: "Speaker replacement", materialId: "MAT-D004", materialLabel: "Redmi Note 12 Display Assembly" },
    { fault: "Camera malfunction", solutionId: "SOL-HIST-0002", solutionLabel: "Camera module replacement", materialId: "MAT-D005", materialLabel: "Laptop RAM 8GB DDR4" },
  ];

  const WORKORDER_COUNT = 65;
  const MIN_AGE = 18; // just past the existing recent seed's max (15), so date ranges don't overlap
  const MAX_AGE = 179;

  const workorders: HistoricalWorkorder[] = [];
  for (let i = 0; i < WORKORDER_COUNT; i++) {
    // Spread roughly evenly across the window, then jitter +/-4 days so
    // volume isn't perfectly uniform week to week (busier/slower patches),
    // like a real business.
    const base = MIN_AGE + Math.round(((MAX_AGE - MIN_AGE) * i) / (WORKORDER_COUNT - 1));
    const jitter = Math.round((rng() - 0.5) * 8);
    const ageDays = Math.min(MAX_AGE, Math.max(MIN_AGE, base + jitter));

    const customer = customers[Math.floor(rng() * customers.length)];
    const bm = brandModels[Math.floor(rng() * brandModels.length)];
    const fs = faultSolutionPairs[Math.floor(rng() * faultSolutionPairs.length)];

    // Older workorders have had time to move further through the pipeline;
    // recent ones skew toward earlier stages — same real-world shape as
    // seedDummyData()'s recent rows.
    let stage: HistoricalWorkorder["stage"];
    const roll = rng();
    if (ageDays > 45) stage = roll < 0.85 ? "Closed" : roll < 0.95 ? "Completed" : "In Progress";
    else if (ageDays > 25) stage = roll < 0.55 ? "Closed" : roll < 0.85 ? "Completed" : "In Progress";
    else stage = roll < 0.25 ? "Closed" : roll < 0.55 ? "Completed" : roll < 0.85 ? "In Progress" : "Created";

    const stageHistory: { at: string; stage: string }[] = [{ at: day(ageDays), stage: "Created" }];
    let closedOffset: number | undefined;
    if (stage !== "Created") {
      const inProgressAge = ageDays - (1 + Math.floor(rng() * 2));
      stageHistory.push({ at: day(Math.max(0, inProgressAge)), stage: "In Progress" });
      if (stage === "Completed" || stage === "Closed") {
        const completedAge = inProgressAge - (2 + Math.floor(rng() * 4));
        stageHistory.push({ at: day(Math.max(0, completedAge)), stage: "Completed" });
        closedOffset = Math.max(0, completedAge);
        if (stage === "Closed") {
          const closedAge = completedAge - (1 + Math.floor(rng() * 3));
          stageHistory.push({ at: day(Math.max(0, closedAge)), stage: "Closed" });
          closedOffset = Math.max(0, closedAge);
        }
      }
    }

    workorders.push({
      id: `SC-HIST-${String(i + 1).padStart(4, "0")}`,
      customer: customer.name,
      customerPhone: customer.phone,
      brandName: bm.brand,
      modelName: bm.model,
      faultDescription: fs.fault,
      stage,
      ageDays,
      receivedDate: day(ageDays),
      solutionId: stage === "Completed" || stage === "Closed" ? fs.solutionId : undefined,
      solutionLabel: stage === "Completed" || stage === "Closed" ? fs.solutionLabel : undefined,
      closedOffset,
      stageHistory,
    });
  }

  if (!(await hasHistRows("service-centre", "SC-HIST-"))) {
    for (const wo of workorders) {
      await createBusinessRecord(DEMO_PARTNER_ID, "service-centre", {
        id: wo.id,
        customer: wo.customer,
        customerPhone: wo.customerPhone,
        brandName: wo.brandName,
        modelName: wo.modelName,
        faultDescription: wo.faultDescription,
        stage: wo.stage,
        status: wo.stage,
        receivedDate: wo.receivedDate,
        warrantyFlag: rng() < 0.2 ? "Yes" : "No",
        ...(wo.solutionId ? { solutionId: wo.solutionId, solutionLabel: wo.solutionLabel } : {}),
        stageHistory: wo.stageHistory,
      });
    }
  }

  // Billing invoices — one per completed/closed historical workorder (dated
  // a day or two after it reached that stage, same as a real shop invoicing
  // once the repair is done), plus a handful of standalone invoices spread
  // across the same window for volume. Mostly Paid, some Draft/Overdue/
  // Partially Paid, matching the real paymentStatus options in
  // src/lib/sample-data/billing.ts.
  if (!(await hasHistRows("billing", "INV-HIST-"))) {
    let invIndex = 0;
    const billable = workorders.filter((w) => w.solutionLabel && w.closedOffset !== undefined);
    for (const wo of billable) {
      invIndex += 1;
      const issueOffset = Math.max(0, (wo.closedOffset as number) - Math.floor(rng() * 2));
      const dueOffset = issueOffset - 7; // 7-day terms, same convention as seedDummyData()'s dueDate math
      const subtotal = 400 + Math.floor(rng() * 2200);
      const taxAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + taxAmount;
      const statusRoll = rng();
      const paymentStatus = statusRoll < 0.72 ? "Paid" : statusRoll < 0.82 ? "Partially Paid" : statusRoll < 0.92 ? "Overdue" : "Draft";
      const amountPaid = paymentStatus === "Paid" ? totalAmount : paymentStatus === "Partially Paid" ? Math.round(totalAmount * 0.5) : 0;
      await createBusinessRecord(DEMO_PARTNER_ID, "billing", {
        id: `INV-HIST-${String(invIndex).padStart(4, "0")}`,
        customer: wo.customer,
        invoiceSource: "Service Centre",
        issueDate: day(issueOffset),
        dueDate: day(dueOffset),
        lineItemsSummary: wo.solutionLabel,
        subtotal,
        taxAmount,
        totalAmount,
        amountPaid,
        amountDue: totalAmount - amountPaid,
        paymentStatus,
        paymentMode: ["UPI", "Cash", "Bank Transfer", "Cheque"][Math.floor(rng() * 4)],
      });
    }

    // Standalone invoices (no linked workorder) for extra volume/spread —
    // aim for ~65 total invoices between the linked ones above and these.
    const STANDALONE_COUNT = Math.max(0, 65 - billable.length);
    for (let i = 0; i < STANDALONE_COUNT; i++) {
      invIndex += 1;
      const issueOffset = 15 + Math.floor(rng() * (MAX_AGE - 15));
      const dueOffset = issueOffset - 7;
      const subtotal = 300 + Math.floor(rng() * 3000);
      const taxAmount = Math.round(subtotal * 0.18);
      const totalAmount = subtotal + taxAmount;
      const statusRoll = rng();
      const paymentStatus = statusRoll < 0.65 ? "Paid" : statusRoll < 0.78 ? "Partially Paid" : statusRoll < 0.9 ? "Overdue" : "Draft";
      const amountPaid = paymentStatus === "Paid" ? totalAmount : paymentStatus === "Partially Paid" ? Math.round(totalAmount * 0.5) : 0;
      const customer = customers[Math.floor(rng() * customers.length)];
      const fs = faultSolutionPairs[Math.floor(rng() * faultSolutionPairs.length)];
      await createBusinessRecord(DEMO_PARTNER_ID, "billing", {
        id: `INV-HIST-${String(invIndex).padStart(4, "0")}`,
        customer: customer.name,
        invoiceSource: "Service Centre",
        issueDate: day(issueOffset),
        dueDate: day(dueOffset),
        lineItemsSummary: fs.solutionLabel,
        subtotal,
        taxAmount,
        totalAmount,
        amountPaid,
        amountDue: totalAmount - amountPaid,
        paymentStatus,
        paymentMode: ["UPI", "Cash", "Bank Transfer", "Cheque"][Math.floor(rng() * 4)],
      });
    }
  }

  // Parts Consumption — one row per completed/closed historical workorder,
  // dated the same day it reached that stage (matching the real
  // deductInventoryForWorkorderAction convention). Biased so plenty land
  // inside the last 90 days (not just the 90-180 tail), since Part
  // Planning's forecast only looks at trailing 30/60/90-day windows from
  // today and needs a real, non-trivial daily rate in each of those.
  if (!(await hasHistRows("inventory-consumption", "CONS-HIST-"))) {
    let consIndex = 0;
    const warehouses = ["Main Warehouse — Hyderabad", "Local Store — Secunderabad"];
    for (const wo of workorders) {
      if (!wo.solutionLabel || wo.closedOffset === undefined) continue;
      // Skip roughly a third so consumption volume isn't a 1:1 mirror of
      // every closed workorder (a repair can also consume parts already
      // reflected in the recent-seed consumption rows, or none at all).
      if (rng() < 0.33) continue;
      const fs = faultSolutionPairs.find((f) => f.solutionLabel === wo.solutionLabel);
      if (!fs) continue;
      consIndex += 1;
      await createBusinessRecord(DEMO_PARTNER_ID, "inventory-consumption", {
        id: `CONS-HIST-${String(consIndex).padStart(4, "0")}`,
        workorderId: wo.id,
        materialId: fs.materialId,
        materialLabel: fs.materialLabel,
        qty: 1 + (rng() < 0.15 ? 1 : 0),
        warehouseName: warehouses[Math.floor(rng() * warehouses.length)],
        serial: "",
        customerName: wo.customer,
        consumedDate: day(wo.closedOffset),
      });
    }
  }

  // Stock — a few extra rows whose lastReceivedAt lands in every Ageing
  // bucket (Fresh/Watch/Aging against the default 60-day threshold), not
  // just "freshly received", per src/lib/inventoryAgeing.ts.
  if (!(await hasHistRows("inventory-stock", "INV-HIST-"))) {
    const ageingRows: { id: string; materialId: string; warehouseName: string; ageDays: number; qty: number }[] = [
      { id: "INV-HIST-0001", materialId: "MAT-D003 — USB-C Charging Port Flex Cable", warehouseName: "Main Warehouse — Hyderabad", ageDays: 10, qty: 9 },
      { id: "INV-HIST-0002", materialId: "MAT-D004 — Redmi Note 12 Display Assembly", warehouseName: "Local Store — Secunderabad", ageDays: 12, qty: 5 },
      { id: "INV-HIST-0003", materialId: "MAT-D005 — Laptop RAM 8GB DDR4", warehouseName: "Main Warehouse — Hyderabad", ageDays: 45, qty: 3 },
      { id: "INV-HIST-0004", materialId: "MAT-D006 — Isopropyl Alcohol Cleaning Solution — 500ml", warehouseName: "Local Store — Secunderabad", ageDays: 50, qty: 6 },
      { id: "INV-HIST-0005", materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly", warehouseName: "Main Warehouse — Hyderabad", ageDays: 75, qty: 4 },
      { id: "INV-HIST-0006", materialId: "MAT-D002 — iPhone 13 Battery", warehouseName: "Main Warehouse — Hyderabad", ageDays: 95, qty: 2 },
    ];
    for (const r of ageingRows) {
      await createBusinessRecord(DEMO_PARTNER_ID, "inventory-stock", {
        id: r.id,
        materialId: r.materialId,
        warehouseName: r.warehouseName,
        qtyOnHand: r.qty,
        reservedQty: 0,
        availableQty: r.qty,
        reorderLevel: 3,
        condition: "Good",
        lastReceivedAt: `${day(r.ageDays)}T09:00:00.000Z`,
      });
    }
  }

  // Stock Adjustments — a few more spread across the window.
  if (!(await hasHistRows("inventory-stock-adjustments", "ADJ-HIST-"))) {
    const adjustments = [
      { id: "ADJ-HIST-0001", materialId: "MAT-D003 — USB-C Charging Port Flex Cable", type: "Decrease", qty: 2, reason: "Damaged", ageDays: 35 },
      { id: "ADJ-HIST-0002", materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly", type: "Increase", qty: 8, reason: "Initial Stock", ageDays: 70 },
      { id: "ADJ-HIST-0003", materialId: "MAT-D005 — Laptop RAM 8GB DDR4", type: "Decrease", qty: 1, reason: "Damaged", ageDays: 110 },
      { id: "ADJ-HIST-0004", materialId: "MAT-D002 — iPhone 13 Battery", type: "Increase", qty: 6, reason: "Initial Stock", ageDays: 150 },
    ];
    for (const a of adjustments) {
      await createBusinessRecord(DEMO_PARTNER_ID, "inventory-stock-adjustments", {
        id: a.id,
        warehouseName: "Main Warehouse — Hyderabad",
        materialId: a.materialId,
        adjustmentType: a.type,
        quantity: a.qty,
        reason: a.reason,
        adjustedBy: "Suresh Kumar",
        date: day(a.ageDays),
      });
    }
  }

  // Return Orders — a few more, spread across the window, each with a
  // proper stageHistory matching the shape actions.ts writes.
  if (!(await hasHistRows("inventory-return-orders", "RTN-HIST-"))) {
    const returns: { id: string; direction: "Inbound" | "Outbound"; materialId: string; ageDays: number; status: string }[] = [
      { id: "RTN-HIST-0001", direction: "Inbound", materialId: "MAT-D001 — Samsung Galaxy M14 Display Assembly", ageDays: 30, status: "Received" },
      { id: "RTN-HIST-0002", direction: "Inbound", materialId: "MAT-D004 — Redmi Note 12 Display Assembly", ageDays: 60, status: "Received" },
      { id: "RTN-HIST-0003", direction: "Outbound", materialId: "MAT-D002 — iPhone 13 Battery", ageDays: 90, status: "Dispatched" },
      { id: "RTN-HIST-0004", direction: "Inbound", materialId: "MAT-D003 — USB-C Charging Port Flex Cable", ageDays: 130, status: "Received" },
    ];
    for (const r of returns) {
      const createdAge = r.ageDays + 3;
      const stageHistory =
        r.direction === "Inbound"
          ? [
              { at: `${day(createdAge)}T10:00:00`, stage: "Pending", actor: "Service Centre" },
              { at: `${day(r.ageDays + 1)}T12:00:00`, stage: "In Transit", actor: "Service Centre" },
              { at: `${day(r.ageDays)}T09:00:00`, stage: "Received", actor: "Warehouse" },
            ]
          : [
              { at: `${day(createdAge)}T10:00:00`, stage: "Pending", actor: "Warehouse" },
              { at: `${day(r.ageDays)}T11:00:00`, stage: "Dispatched", actor: "Warehouse" },
            ];
      await createBusinessRecord(DEMO_PARTNER_ID, "inventory-return-orders", {
        id: r.id,
        direction: r.direction,
        returnType: r.direction === "Inbound" ? "Good" : "Defective",
        materialId: r.materialId,
        quantity: 1 + Math.floor(rng() * 2),
        sourceLocation: r.direction === "Inbound" ? "Demo Service Centre" : "Main Warehouse — Hyderabad",
        ...(r.direction === "Inbound"
          ? { destinationWarehouseName: "Main Warehouse — Hyderabad" }
          : { vendorName: "Li-ion Battery Distributors Pvt Ltd", challanNumber: `CHN-HIST-${r.id.slice(-4)}` }),
        status: r.status,
        createdDate: day(createdAge),
        receivedDate: r.direction === "Inbound" ? day(r.ageDays) : null,
        stageHistory,
      });
    }
  }
}

export async function createDemoPartner(): Promise<{ partnerId: string; loginContact: string; password: string; alreadyExisted: boolean }> {
  const before = await prisma.partner.findUnique({ where: { id: DEMO_PARTNER_ID } });
  const partner = await ensureDemoPartner();
  await seedDummyData();
  await seedHistoricalReportData();
  return { partnerId: partner.id, loginContact: DEMO_LOGIN_CONTACT, password: DEMO_PASSWORD, alreadyExisted: Boolean(before) };
}
