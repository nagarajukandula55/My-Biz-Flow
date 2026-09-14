/**
 * DEMO / SEED DATA ONLY — NOT real BusinessRecord data.
 *
 * Inserts a handful of realistic-looking sample Quotations, Delivery
 * Challans, Proforma Invoices and Credit/Debit Notes for one partner, so
 * the Billing module's sales-document pages have something to look at
 * out of the box instead of an empty list. Same convention as
 * scripts/seed-launch-data.ts (a one-off, idempotent script run manually
 * against a real DATABASE_URL — not something the app runs itself), and
 * the same "clearly-labelled demo rows" convention
 * src/lib/sample-data/service-centre-brands.ts uses for its sample rows.
 *
 * These four sales-document modules (billing-quotations,
 * billing-delivery-challans, billing-proforma-invoices,
 * billing-credit-notes) are 100% BusinessRecord-backed — their list pages
 * call listBusinessRecords() directly with no static-array fallback (see
 * src/app/partner/[partnerId]/billing/credit-notes/page.tsx) — so there is
 * no "sample rows" file to add static demo content to that would actually
 * render; inserting real BusinessRecord rows for a partner is the only
 * way this module's pages show demo content. Idempotent: skips a
 * moduleSlug entirely if that partner already has any records there, so
 * re-running this never duplicates rows or clobbers real data once a
 * partner starts using the system.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/seed-billing-sales-documents-demo.ts <partnerId>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function computeTotals(items: { quantity: number; unitPrice: number; taxRate: number }[]) {
  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const taxTotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice * (it.taxRate / 100), 0);
  return { subtotal, taxTotal, grandTotal: subtotal + taxTotal };
}

async function seedModule(partnerId: string, moduleSlug: string, rows: Record<string, unknown>[]) {
  const existing = await prisma.businessRecord.count({ where: { partnerId, moduleSlug } });
  if (existing > 0) {
    console.log(`Skipping ${moduleSlug} — partner ${partnerId} already has ${existing} record(s).`);
    return;
  }
  for (const data of rows) {
    await prisma.businessRecord.create({
      data: { partnerId, moduleSlug, recordKey: String(data.id), data },
    });
  }
  console.log(`Seeded ${rows.length} demo ${moduleSlug} record(s) for partner ${partnerId}.`);
}

async function main() {
  const partnerId = process.argv[2];
  if (!partnerId) {
    console.error("Usage: npx tsx scripts/seed-billing-sales-documents-demo.ts <partnerId>");
    process.exit(1);
  }

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) {
    console.error(`No partner found with id "${partnerId}".`);
    process.exit(1);
  }

  type Item = { description: string; quantity: number; unit: string; unitPrice: number; taxRate: number };
  const withTotals = (items: Item[]) => {
    const totals = computeTotals(items);
    return {
      items,
      lineItemsSummary: items.map((it) => it.description).join("; "),
      subtotal: totals.subtotal,
      taxAmount: totals.taxTotal,
      totalAmount: totals.grandTotal,
    };
  };

  // -- Quotations ---------------------------------------------------------
  const quotations = [
    {
      id: "QTN-1001",
      contact: "Bluepeak Traders",
      issueDate: "2026-08-05",
      validUntil: "2026-08-20",
      status: "Sent",
      notes: "Valid for 15 days from issue.",
      ...withTotals([{ description: "Annual maintenance contract", quantity: 1, unit: "package", unitPrice: 45000, taxRate: 18 }]),
    },
    {
      id: "QTN-1002",
      contact: "Orchid Interiors",
      issueDate: "2026-08-10",
      validUntil: "2026-08-25",
      status: "Draft",
      notes: "Pending client walkthrough before final pricing.",
      ...withTotals([
        { description: "Interior design consultation", quantity: 3, unit: "hrs", unitPrice: 2500, taxRate: 18 },
        { description: "3D rendering package", quantity: 1, unit: "package", unitPrice: 18000, taxRate: 18 },
      ]),
    },
    {
      id: "QTN-1003",
      contact: "Nimbus Logistics",
      issueDate: "2026-08-14",
      validUntil: "2026-08-29",
      status: "Accepted",
      notes: "Approved by procurement, PO to follow.",
      ...withTotals([{ description: "Fleet GPS tracking — 10 units", quantity: 10, unit: "unit", unitPrice: 3200, taxRate: 18 }]),
    },
    {
      id: "QTN-1004",
      contact: "Sunrise Bakery",
      issueDate: "2026-08-18",
      validUntil: "2026-09-02",
      status: "Rejected",
      notes: "Client went with a lower-cost vendor.",
      ...withTotals([{ description: "POS terminal upgrade — 2 units", quantity: 2, unit: "unit", unitPrice: 15000, taxRate: 18 }]),
    },
    {
      id: "QTN-1005",
      contact: "Harborview Enterprises",
      issueDate: "2026-08-22",
      validUntil: "2026-09-06",
      status: "Sent",
      notes: "Bulk discount applied for order above 50 units.",
      ...withTotals([{ description: "Custom signage — 60 units", quantity: 60, unit: "unit", unitPrice: 850, taxRate: 12 }]),
    },
  ];

  // -- Delivery Challans ----------------------------------------------------
  const deliveryChallans = [
    {
      id: "DC-2001",
      contact: "Sunrise Bakery",
      issueDate: "2026-08-06",
      purpose: "Line Sales",
      vehicleNumber: "KA 01 AB 4521",
      dispatchAddress: "12 MG Road, Bengaluru",
      status: "Sent",
      notes: "Goods dispatched via own vehicle.",
      ...withTotals([{ description: "POS hardware kit", quantity: 2, unit: "kit", unitPrice: 6000, taxRate: 18 }]),
    },
    {
      id: "DC-2002",
      contact: "Bluepeak Traders",
      issueDate: "2026-08-09",
      purpose: "Job Work",
      vehicleNumber: "KA 05 CD 7788",
      dispatchAddress: "Whitefield Industrial Area, Bengaluru",
      status: "Accepted",
      notes: "For repair and return.",
      ...withTotals([{ description: "Server chassis for repair", quantity: 1, unit: "unit", unitPrice: 0, taxRate: 0 }]),
    },
    {
      id: "DC-2003",
      contact: "Nimbus Logistics",
      issueDate: "2026-08-13",
      purpose: "Sale on Approval",
      vehicleNumber: "KA 09 EF 3345",
      dispatchAddress: "Peenya Industrial Estate, Bengaluru",
      status: "Sent",
      notes: "Approval expected within 7 days.",
      ...withTotals([{ description: "Fleet dash cameras — 15 units", quantity: 15, unit: "unit", unitPrice: 2100, taxRate: 18 }]),
    },
    {
      id: "DC-2004",
      contact: "Orchid Interiors",
      issueDate: "2026-08-19",
      purpose: "Exhibition / Fairs",
      vehicleNumber: "KA 02 GH 9987",
      dispatchAddress: "Bangalore International Exhibition Centre",
      status: "Draft",
      notes: "Display samples for trade fair.",
      ...withTotals([{ description: "Sample furniture set", quantity: 1, unit: "set", unitPrice: 32000, taxRate: 18 }]),
    },
  ];

  // -- Proforma Invoices ----------------------------------------------------
  const proformaInvoices = [
    {
      id: "PI-3001",
      contact: "Harborview Enterprises",
      issueDate: "2026-08-07",
      validUntil: "2026-08-21",
      status: "Sent",
      notes: "Advance payment required before dispatch.",
      ...withTotals([{ description: "Custom signage — 60 units", quantity: 60, unit: "unit", unitPrice: 850, taxRate: 12 }]),
    },
    {
      id: "PI-3002",
      contact: "Bluepeak Traders",
      issueDate: "2026-08-12",
      validUntil: "2026-08-27",
      status: "Accepted",
      notes: "50% advance received, balance on delivery.",
      ...withTotals([{ description: "Annual maintenance contract", quantity: 1, unit: "package", unitPrice: 45000, taxRate: 18 }]),
    },
    {
      id: "PI-3003",
      contact: "Sunrise Bakery",
      issueDate: "2026-08-16",
      validUntil: "2026-08-31",
      status: "Draft",
      notes: "Awaiting client confirmation on quantity.",
      ...withTotals([{ description: "POS terminal upgrade — 2 units", quantity: 2, unit: "unit", unitPrice: 15000, taxRate: 18 }]),
    },
    {
      id: "PI-3004",
      contact: "Nimbus Logistics",
      issueDate: "2026-08-21",
      validUntil: "2026-09-05",
      status: "Sent",
      notes: "For import documentation purposes.",
      ...withTotals([{ description: "Fleet GPS tracking — 10 units", quantity: 10, unit: "unit", unitPrice: 3200, taxRate: 18 }]),
    },
  ];

  // -- Credit / Debit Notes -------------------------------------------------
  const creditNotes = [
    {
      id: "CN-4001",
      noteType: "Credit Note",
      contact: "Orchid Interiors",
      linkedInvoiceId: "INV-3300",
      reason: "Sales Return",
      issueDate: "2026-08-02",
      ...withTotals([{ description: "Design consultation — partial return", quantity: 1, unit: "package", unitPrice: 4000, taxRate: 18 }]),
    },
    {
      id: "CN-4002",
      noteType: "Credit Note",
      contact: "Sunrise Bakery",
      linkedInvoiceId: "INV-3298",
      reason: "Post-Sale Discount",
      issueDate: "2026-08-11",
      ...withTotals([{ description: "Loyalty discount adjustment", quantity: 1, unit: "adjustment", unitPrice: 900, taxRate: 18 }]),
    },
    {
      id: "DN-4003",
      noteType: "Debit Note",
      contact: "Bluepeak Traders",
      linkedInvoiceId: "INV-3301",
      reason: "Rate Difference",
      issueDate: "2026-08-15",
      ...withTotals([{ description: "Consulting hours rate correction", quantity: 2, unit: "hrs", unitPrice: 500, taxRate: 18 }]),
    },
    {
      id: "DN-4004",
      noteType: "Debit Note",
      contact: "Nimbus Logistics",
      linkedInvoiceId: "INV-3299",
      reason: "Billing Error",
      issueDate: "2026-08-20",
      ...withTotals([{ description: "Under-billed retainer correction", quantity: 1, unit: "month", unitPrice: 1500, taxRate: 18 }]),
    },
  ];

  await seedModule(partnerId, "billing-quotations", quotations);
  await seedModule(partnerId, "billing-delivery-challans", deliveryChallans);
  await seedModule(partnerId, "billing-proforma-invoices", proformaInvoices);
  await seedModule(partnerId, "billing-credit-notes", creditNotes);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
