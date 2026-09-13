/**
 * One-off data backfill: AN-CRM (MongoDB) -> My-Biz-Flow Service Centre (Postgres/Prisma).
 *
 * NOT WIRED INTO ANY BUILD/CI STEP. This is a standalone script, run manually
 * by a human with `npx tsx scripts/migrate-an-crm-to-service-centre.ts [--apply]`.
 *
 * Prerequisites (not installed by default — this repo has no MongoDB client):
 *   npm install --save-dev mongoose tsx
 *
 * Env vars:
 *   AN_CRM_MONGO_URI   Required. Read-only connection string to AN-CRM's Mongo. Never hardcode credentials.
 *   MIGRATE_PARTNER_TYPE_ID  Optional. partnerTypeId to assign newly-created Partner rows (defaults to "service-centre").
 *
 * Flags:
 *   --apply     Actually write to Postgres. Without it, the script is a dry run:
 *               it connects to Mongo (read-only), computes what it WOULD do, and
 *               only logs counts — no Postgres writes happen at all.
 *
 * Idempotency:
 *   - Partner rows are upserted by `internalKey` (deterministic, derived from the
 *     source Mongo _id — see toInternalKey()), so re-running never creates a
 *     second Partner for the same source Business/VendorProfile.
 *   - BusinessRecord rows are upserted against the existing unique constraint
 *     @@unique([partnerId, moduleSlug, recordKey]) (see prisma/schema.prisma),
 *     using the source Mongo document's ObjectId hex string directly as
 *     `recordKey` wherever a stable, natural key isn't otherwise required —
 *     so re-running this script is always safe.
 *
 * Scope (per the accompanying gap-analysis report — see PR description):
 *   - AN-CRM `Business` (with an attached VendorProfile) that represents a
 *     service-centre-type tenant -> one My-Biz-Flow `Partner` row.
 *   - AN-CRM `CrmJobSheet` -> `BusinessRecord` rows under moduleSlug
 *     "service-centre", field keys matching serviceCentreFormFields /
 *     serviceCentreColumns in src/lib/sample-data/service-centre.ts exactly
 *     (stage/brandId/brandName/partLines/serviceLines/etc.), so the existing
 *     RecordDetail/RecordForm/DataTable pages read the migrated data with no
 *     code changes.
 *   - AN-CRM `FaultCode`/`SymptomCode`/`Solution`/`BOM` -> BusinessRecord rows
 *     under "service-centre-fault-codes" / "service-centre-symptom-codes" /
 *     "service-centre-solutions" / "inventory-bom" respectively, field keys
 *     matched to each module's own sample-data file.
 *   - AN-CRM `VendorProfile` (the sub-SC kind, not the tenant-Business
 *     kind above) -> BusinessRecord rows under "service-centre-sc-profile"
 *     (see src/lib/sample-data/service-centre-sc-profile.ts and its
 *     code comment on why this is NOT folded into Partner).
 *   - AN-CRM `SalesInvoice` -> BusinessRecord rows under "billing", and its
 *     `Payment` documents -> BusinessRecord rows under "billing-payments"
 *     (one invoice can have many payments — see
 *     src/lib/sample-data/billing-payments.ts's getInvoiceBalance(), which
 *     computes an invoice's paid/balance from its linked payments instead
 *     of a single stored field, so partial-payment history is preserved).
 *
 * This script deliberately does NOT touch AN-CRM's broader SaaS layer
 * (referrals, promo codes, Telegram, plan pricing) — out of scope, see the
 * task brief. `Invoice` (the older model, superseded by SalesInvoice) and
 * `Agreement` (explicitly excluded from this app's scope) are counted only,
 * never migrated.
 */

import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const APPLY = process.argv.includes("--apply");
const AN_CRM_MONGO_URI = process.env.AN_CRM_MONGO_URI;
const DEFAULT_PARTNER_TYPE_ID = process.env.MIGRATE_PARTNER_TYPE_ID ?? "service-centre";

if (!AN_CRM_MONGO_URI) {
  console.error("AN_CRM_MONGO_URI is required (read-only connection string to AN-CRM's Mongo). Aborting.");
  process.exit(1);
}

const prisma = new PrismaClient();

// --- Minimal, read-only Mongoose schemas -----------------------------------
// Loose/untyped on purpose: we only read fields we need, and AN-CRM's real
// schemas may have evolved since this was written. `strict: false` lets any
// extra fields pass through without validation errors on read.
const looseSchema = () => new mongoose.Schema({}, { strict: false, collection: undefined });

function model(name: string, collection: string) {
  return mongoose.model(name, looseSchema(), collection);
}

const BusinessModel = model("Business", "businesses");
const VendorProfileModel = model("VendorProfile", "vendorprofiles");
const CrmJobSheetModel = model("CrmJobSheet", "crmjobsheets");
const FaultCodeModel = model("FaultCode", "faultcodes");
const SymptomCodeModel = model("SymptomCode", "symptomcodes");
const SolutionModel = model("Solution", "solutions");
const BomModel = model("BOM", "boms");
// Counted only in this pass — not migrated yet.
const InvoiceModel = model("Invoice", "invoices");
const SalesInvoiceModel = model("SalesInvoice", "salesinvoices");
const PaymentModel = model("Payment", "payments");
const AgreementModel = model("Agreement", "agreements");

/** Deterministic Partner.internalKey derived from a source Mongo _id — stable across re-runs, used as the upsert key. */
function toInternalKey(businessId: string): string {
  return `BIZ002-ANCRM-${businessId}`;
}

/** Generates a short prefixed-id the first time a given Mongo _id is seen in THIS run, and remembers it for cross-references within the same run (per the task brief — no separate mapping table). */
function makeIdAllocator(prefix: string, startAt = 1) {
  const map = new Map<string, string>();
  let counter = startAt;
  return {
    resolve(mongoId: string): string {
      const existing = map.get(mongoId);
      if (existing) return existing;
      const id = `${prefix}${String(counter).padStart(4, "0")}`;
      counter += 1;
      map.set(mongoId, id);
      return id;
    },
  };
}

// Migrated Businesses become Partner rows of partnerTypeId "service-centre",
// whose idPrefix is now "SC" (see PartnerType.idPrefix / src/lib/partnerData.ts) —
// so this migration-only allocator mirrors that prefix. High range (9000+) to
// avoid colliding with real SC#### ids assigned by the live signup path.
const partnerIdAllocator = makeIdAllocator("SC", 9000);

type Counts = Record<string, { seen: number; created: number; updated: number; skipped: number }>;

function bumpSeen(counts: Counts, key: string) {
  counts[key] ??= { seen: 0, created: 0, updated: 0, skipped: 0 };
  counts[key].seen += 1;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (will write to Postgres)" : "DRY RUN (no Postgres writes)"}`);
  await mongoose.connect(AN_CRM_MONGO_URI!, { serverSelectionTimeoutMS: 10_000 });
  console.log("Connected to AN-CRM MongoDB (read-only).");

  const counts: Counts = {};

  try {
    // 1) Businesses -> Partner rows -----------------------------------------
    const businesses = await BusinessModel.find({}).lean();
    for (const biz of businesses) {
      const mongoId = String(biz._id);
      bumpSeen(counts, "Partner");
      const internalKey = toInternalKey(mongoId);
      const partnerId = partnerIdAllocator.resolve(mongoId);

      const partnerData = {
        id: partnerId,
        internalKey,
        businessId: "BIZ002",
        partnerTypeId: DEFAULT_PARTNER_TYPE_ID,
        businessName: String(biz.name ?? biz.businessName ?? "Migrated Business"),
        addressLine: biz.addressLine ?? null,
        city: String(biz.city ?? ""),
        state: String(biz.state ?? ""),
        pincode: String(biz.pincode ?? ""),
        gstin: biz.gstin ?? null,
        businessEmail: String(biz.email ?? biz.businessEmail ?? ""),
        businessContact: String(biz.phone ?? biz.businessContact ?? ""),
        loginContact: String(biz.phone ?? biz.email ?? mongoId),
        // A real run must generate + email a fresh password per Partner's own
        // signup flow, never fabricate a hash here — left as a placeholder
        // that forces mustChangePassword and blocks login until reset.
        passwordHash: "MIGRATION_PLACEHOLDER_REQUIRES_PASSWORD_RESET",
        mustChangePassword: true,
        status: "Active",
        subscriptionStatus: "Trial",
      };

      if (APPLY) {
        const existing = await prisma.partner.findUnique({ where: { internalKey } });
        await prisma.partner.upsert({
          where: { internalKey },
          create: partnerData,
          update: { businessName: partnerData.businessName, city: partnerData.city, state: partnerData.state },
        });
        if (existing) counts["Partner"].updated += 1;
        else counts["Partner"].created += 1;
      } else {
        counts["Partner"].created += 1; // would-create, in dry-run terms
      }

      // 2) This business's CrmJobSheets -> "service-centre" BusinessRecords --
      const jobSheets = await CrmJobSheetModel.find({ businessId: biz._id }).lean();
      for (const job of jobSheets) {
        bumpSeen(counts, "service-centre (JobSheet)");
        const recordKey = String(job._id);
        const data = {
          id: String(job.jobNumber ?? recordKey),
          customer: String(job.customerName ?? job.customer ?? ""),
          device: String(job.device ?? [job.brandName, job.modelName].filter(Boolean).join(" ")),
          brandName: job.brandName ?? undefined,
          modelName: job.modelName ?? undefined,
          technicianName: job.technicianName ?? undefined,
          priority: job.priority ?? "Medium",
          status: job.status ?? "Diagnosed",
          receivedDate: job.receivedDate ?? job.createdAt ?? new Date().toISOString(),
          estimatedAmount: Number(job.estimatedAmount ?? 0),
          warrantyFlag: Boolean(job.warrantyFlag ?? job.underWarranty),
          branch: job.branch ?? undefined,
          // Milestone lifecycle + future-proofing fields — matches
          // service-centre.ts's extractLifecycleFromRecord()/serviceCentreFormFields exactly.
          stage: job.stage ?? "Created",
          imeiOrSerialNumber: job.imeiOrSerialNumber ?? job.imei ?? undefined,
          odometerReading: job.odometerReading ?? undefined,
          warrantyStatus: job.warrantyStatus ?? undefined,
          warrantyExpiryDate: job.warrantyExpiryDate ?? undefined,
          slaDate: job.slaDate ?? undefined,
          estimatedCost: job.estimatedCost ?? undefined,
          actualCost: job.actualCost ?? undefined,
          issueDescription: job.issueDescription ?? undefined,
          internalNotes: job.internalNotes ?? undefined,
          customerNotes: job.customerNotes ?? undefined,
          partLines: Array.isArray(job.partLines) ? job.partLines : [],
          serviceLines: Array.isArray(job.serviceLines) ? job.serviceLines : [],
        };

        if (APPLY) {
          const existing = await prisma.businessRecord.findUnique({
            where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "service-centre", recordKey } },
          });
          await prisma.businessRecord.upsert({
            where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "service-centre", recordKey } },
            create: { partnerId, moduleSlug: "service-centre", recordKey, data },
            update: { data },
          });
          if (existing) counts["service-centre (JobSheet)"].updated += 1;
          else counts["service-centre (JobSheet)"].created += 1;
        } else {
          counts["service-centre (JobSheet)"].created += 1;
        }
      }

      // 3) Catalogs scoped to this business: FaultCode/SymptomCode/Solution/BOM
      await migrateCatalog(FaultCodeModel, biz._id, partnerId, "service-centre-fault-codes", counts, "FaultCode", (doc) => ({
        id: String(doc.code ?? doc._id),
        description: String(doc.description ?? ""),
        category: doc.category ?? undefined,
        deviceCategoryScope: Array.isArray(doc.deviceCategoryScope) ? doc.deviceCategoryScope : [],
        parentId: doc.parentId ?? "",
        isActive: doc.isActive === false ? "Inactive" : "Active",
      }));

      await migrateCatalog(SymptomCodeModel, biz._id, partnerId, "service-centre-symptom-codes", counts, "SymptomCode", (doc) => ({
        id: String(doc.code ?? doc._id),
        description: String(doc.description ?? ""),
        category: doc.category ?? undefined,
        isActive: doc.isActive === false ? "Inactive" : "Active",
      }));

      await migrateCatalog(SolutionModel, biz._id, partnerId, "service-centre-solutions", counts, "Solution", (doc) => ({
        id: String(doc.code ?? doc._id),
        name: String(doc.name ?? doc.title ?? ""),
        estimatedRepairMinutes: doc.estimatedRepairMinutes ?? undefined,
        standardLaborCost: doc.standardLaborCost ?? undefined,
        deviceCategoryScope: Array.isArray(doc.deviceCategoryScope) ? doc.deviceCategoryScope : [],
        isActive: doc.isActive === false ? "Inactive" : "Active",
      }));

      await migrateCatalog(BomModel, biz._id, partnerId, "inventory-bom", counts, "BOM", (doc) => ({
        id: String(doc.materialCode ?? doc._id),
        description: String(doc.description ?? ""),
        hsnCode: doc.hsnCode ?? undefined,
        rate: Number(doc.rate ?? 0),
        taxPercent: Number(doc.taxPercent ?? 18),
        mrp: doc.mrp ?? undefined,
        serialized: Boolean(doc.serialized),
        status: doc.status ?? "Active",
        // Fields added in this pass — see src/lib/sample-data/bom.ts.
        reorderLevel: doc.reorderLevel ?? undefined,
        supplierRef: doc.supplierRef ?? doc.vendorId ?? undefined,
        batchNumber: doc.batchNumber ?? undefined,
        warrantyPeriodDays: doc.warrantyPeriodDays ?? undefined,
      }));

      // 4) Sub-SC VendorProfiles (parentVendorId points at another
      //    VendorProfile _within this business_, per AN-CRM's model) ------
      // These become "SC-####" ids inside the BusinessRecord `id` field —
      // deliberately using a dash ("SC-") to keep this id space visually and
      // programmatically distinct from Partner.id's own "SC####" (no-dash)
      // counter above: a sub-SC BusinessRecord is never a tenant Partner, and
      // the two counters must never be confused or merged.
      const vendorProfiles = await VendorProfileModel.find({ businessId: biz._id }).lean();
      const scProfileIdAllocator = makeIdAllocator("SC-", 1);
      // Pre-resolve every id first so parentScId cross-references always resolve within this run.
      for (const vp of vendorProfiles) scProfileIdAllocator.resolve(String(vp._id));
      for (const vp of vendorProfiles) {
        bumpSeen(counts, "service-centre-sc-profile");
        const recordKey = String(vp._id);
        const data = {
          id: scProfileIdAllocator.resolve(recordKey),
          businessName: String(vp.businessName ?? vp.name ?? ""),
          onboardingStatus: vp.onboardingStatus ?? "APPLIED",
          parentScId: vp.parentVendorId ? scProfileIdAllocator.resolve(String(vp.parentVendorId)) : "",
          gstin: vp.gstin ?? undefined,
          pan: vp.pan ?? undefined,
          bankAccountName: vp.bankAccountName ?? undefined,
          bankAccountNumber: vp.bankAccountNumber ?? undefined,
          bankIFSC: vp.bankIFSC ?? vp.ifsc ?? undefined,
          serviceArea: vp.serviceArea ?? undefined,
          serviceRadiusKm: vp.serviceRadiusKm ?? vp.serviceRadius ?? undefined,
          kycDocRef: vp.kycDocRef ?? undefined,
          agreementDocRef: vp.agreementDocRef ?? undefined,
          rating: vp.rating ?? undefined,
          status: vp.status === "Inactive" ? "Inactive" : "Active",
        };

  if (APPLY) {
          const existing = await prisma.businessRecord.findUnique({
            where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "service-centre-sc-profile", recordKey } },
          });
          await prisma.businessRecord.upsert({
            where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "service-centre-sc-profile", recordKey } },
            create: { partnerId, moduleSlug: "service-centre-sc-profile", recordKey, data },
            update: { data },
          });
          if (existing) counts["service-centre-sc-profile"].updated += 1;
          else counts["service-centre-sc-profile"].created += 1;
        } else {
          counts["service-centre-sc-profile"].created += 1;
        }
      }

      // 5) SalesInvoice -> "billing" BusinessRecords ---------------------------
      // The data-model question flagged in an earlier pass (how AN-CRM's
      // separate Invoice/SalesInvoice/Payment documents collapse into this
      // app's billing shape without losing partial-payment history) is now
      // resolved: src/lib/sample-data/billing-payments.ts made Payments their
      // own BusinessRecord module ("billing-payments") linked by invoiceId,
      // with the invoice's paid/balance computed from linked payments
      // (getInvoiceBalance()) rather than stored as a single field. So a
      // SalesInvoice with N Payments maps to 1 "billing" record + N
      // "billing-payments" records, matching AN-CRM's real shape exactly —
      // no data loss, no schema change needed.
      const salesInvoices = await SalesInvoiceModel.find({ businessId: biz._id }).lean();
      const invoiceIdAllocator = makeIdAllocator("INV-", 4000);
      for (const inv of salesInvoices) invoiceIdAllocator.resolve(String(inv._id));
      for (const inv of salesInvoices) {
        bumpSeen(counts, "billing (SalesInvoice)");
        const recordKey = String(inv._id);
        const invoiceId = invoiceIdAllocator.resolve(recordKey);
        const items = Array.isArray(inv.items) ? inv.items : [];
        const lineItemsSummary = items
          .map((it: any) => `${it.description ?? ""} — ${it.quantity ?? 1} ${it.unit ?? "unit"}`)
          .join("; ");
        const statusMap: Record<string, string> = {
          DRAFT: "Draft",
          SENT: "Sent",
          PAID: "Paid",
          OVERDUE: "Overdue",
          PARTIAL: "Partially Paid",
          CANCELLED: "Draft",
          FAILED: "Overdue",
        };
        const data = {
          id: invoiceId,
          customer: String(inv.customer?.name ?? inv.customer?.company ?? ""),
          issueDate: inv.issueDate ?? inv.createdAt ?? new Date().toISOString(),
          dueDate: inv.dueDate ?? undefined,
          lineItemsSummary,
          subtotal: Number(inv.subtotal ?? 0),
          taxAmount: Number(inv.taxTotal ?? 0),
          discountAmount: Number(inv.discountAmount ?? 0),
          roundOff: 0,
          totalAmount: Number(inv.grandTotal ?? 0),
          amountPaid: Number(inv.paidAmount ?? 0),
          amountDue: Number(inv.grandTotal ?? 0) - Number(inv.paidAmount ?? 0),
          paymentStatus: statusMap[String(inv.status ?? "SENT")] ?? "Sent",
          paymentMode: inv.paymentMethod ?? undefined,
        };

        if (APPLY) {
          const existing = await prisma.businessRecord.findUnique({
            where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing", recordKey } },
          });
          await prisma.businessRecord.upsert({
            where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing", recordKey } },
            create: { partnerId, moduleSlug: "billing", recordKey, data },
            update: { data },
          });
          if (existing) counts["billing (SalesInvoice)"].updated += 1;
          else counts["billing (SalesInvoice)"].created += 1;
        } else {
          counts["billing (SalesInvoice)"].created += 1;
        }

        // 6) This invoice's Payments -> "billing-payments" BusinessRecords ---
        // AN-CRM's Payment model keys on invoiceId as a free-text field (not
        // always the Mongo _id — see Payment.ts), so match defensively on
        // both the raw invoiceId string and this invoice's own _id/number.
        const payments = await PaymentModel.find({
          $or: [
            { invoiceId: recordKey },
            { invoiceId: String(inv.invoiceNumber ?? "") },
          ],
        }).lean();
        const paymentIdAllocator = makeIdAllocator(`PMT-${invoiceId}-`, 1);
        for (const pay of payments) {
          bumpSeen(counts, "billing-payments (Payment)");
          const payRecordKey = String(pay._id);
          const payData = {
            id: paymentIdAllocator.resolve(payRecordKey),
            invoiceId,
            contact: data.customer,
            amount: Number(pay.amount ?? 0),
            mode: pay.method ?? "Bank Transfer",
            date: pay.paidAt ?? pay.createdAt ?? new Date().toISOString(),
            reference: pay.utr ?? pay.gatewayPaymentId ?? undefined,
          };

          if (APPLY) {
            const existingPay = await prisma.businessRecord.findUnique({
              where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing-payments", recordKey: payRecordKey } },
            });
            await prisma.businessRecord.upsert({
              where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug: "billing-payments", recordKey: payRecordKey } },
              create: { partnerId, moduleSlug: "billing-payments", recordKey: payRecordKey, data: payData },
              update: { data: payData },
            });
            if (existingPay) counts["billing-payments (Payment)"].updated += 1;
            else counts["billing-payments (Payment)"].created += 1;
          } else {
            counts["billing-payments (Payment)"].created += 1;
          }
        }
      }
    }

    // Invoice.ts is AN-CRM's older ecommerce/order invoice model, superseded
    // by SalesInvoice (see SalesInvoice.ts's own top comment: "FAILED/PARTIAL
    // added when Invoice.ts... was merged into this one") — any business
    // still on it has already been folded into SalesInvoice going forward,
    // so it's counted only, not migrated separately, to avoid duplicate
    // invoice records. Agreement stays excluded per explicit scope (assigned
    // to a different module later) — counted only, never migrated.
    for (const [label, m] of [
      ["Invoice (legacy, superseded by SalesInvoice — counted only)", InvoiceModel],
      ["Agreement (explicitly excluded — counted only)", AgreementModel],
    ] as const) {
      const n = await m.countDocuments({});
      counts[label] = { seen: n, created: 0, updated: 0, skipped: n };
    }
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
  }

  console.log("\n=== Migration summary ===");
  for (const [entity, c] of Object.entries(counts)) {
    console.log(`${entity.padEnd(40)} seen=${c.seen}  created=${c.created}  updated=${c.updated}  skipped=${c.skipped}`);
  }
  if (!APPLY) {
    console.log("\nDry run only — no Postgres writes were made. Re-run with --apply to write.");
  }
}

/** Shared helper for the four business-scoped catalogs (FaultCode/SymptomCode/Solution/BOM) — same upsert shape, different moduleSlug/mapper. */
async function migrateCatalog(
  model: mongoose.Model<any>,
  mongoBusinessId: unknown,
  partnerId: string,
  moduleSlug: string,
  counts: Counts,
  label: string,
  mapDoc: (doc: any) => Record<string, unknown>
) {
  const docs = await model.find({ businessId: mongoBusinessId }).lean();
  for (const doc of docs) {
    bumpSeen(counts, moduleSlug);
    const recordKey = String(doc._id);
    const data = mapDoc(doc);
    if (APPLY) {
      const existing = await prisma.businessRecord.findUnique({
        where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } },
      });
      await prisma.businessRecord.upsert({
        where: { partnerId_moduleSlug_recordKey: { partnerId, moduleSlug, recordKey } },
        create: { partnerId, moduleSlug, recordKey, data },
        update: { data },
      });
      if (existing) counts[moduleSlug].updated += 1;
      else counts[moduleSlug].created += 1;
    } else {
      counts[moduleSlug].created += 1;
    }
  }
  void label; // kept for readability at call sites; not otherwise used
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
