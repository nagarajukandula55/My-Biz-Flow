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
 * ---------------------------------------------------------------------------
 * TENANCY: one Partner per AN-CRM *VendorProfile*, NOT per Business.
 * ---------------------------------------------------------------------------
 * An earlier revision of this script looped over `Business` documents and
 * pulled every CrmJobSheet/catalog row for that businessId with no vendor
 * filter. That is wrong, and on real data it is a cross-tenant data leak:
 *
 *   CrmJobSheet.vendorId's own field comment (src/models/CrmJobSheet.ts):
 *     "VendorProfile._id of the Service Center this job sheet belongs to.
 *      Most onboarded vendors share one default public Business, so
 *      businessId alone does not isolate one vendor's job sheets from
 *      another's"
 *
 *   ...and the unique index just below it (businessId + vendorId +
 *   jobSheetNumber) exists precisely because two different vendors under
 *   the SAME shared Business legitimately produce the same jobSheetNumber.
 *
 * The same shape holds for FaultCode/SymptomCode/Solution/BOM, each of which
 * carries an optional `vendorId` "so a vendor's own entries stay private to
 * them within their business" (BOM.ts top-of-file comment), and for
 * VendorProfile itself, whose `businessId` points at "the shared platform
 * Business which every self-signed-up vendor points its businessId at"
 * (VendorProfile.ts).
 *
 * So: AN-CRM's tenant boundary is the VendorProfile. This script therefore
 * creates one My-Biz-Flow Partner per VendorProfile, and scopes EVERY
 * sub-query to that vendorId (plus its business's shared/global rows, which
 * the vendor legitimately sees — see vendorScopedCatalogQuery()).
 *
 * A Business with no VendorProfile attached (a pure Brand/POS/Sales tenant)
 * is out of scope here and is counted as skipped.
 *
 * Idempotency:
 *   - Partner rows are upserted by `internalKey` (deterministic, derived from
 *     the source VendorProfile _id — see toInternalKey()), so re-running never
 *     creates a second Partner for the same source vendor.
 *   - BusinessRecord rows are upserted against the existing unique constraint
 *     @@unique([partnerId, moduleSlug, recordKey]) (see prisma/schema.prisma),
 *     using the source Mongo document's ObjectId hex string directly as
 *     `recordKey` — so re-running this script is always safe.
 *
 * Scope:
 *   - AN-CRM `VendorProfile` -> one My-Biz-Flow `Partner` row (the tenant).
 *   - AN-CRM `CrmJobSheet` -> `BusinessRecord` rows under moduleSlug
 *     "service-centre", field keys matching serviceCentreFormFields /
 *     serviceCentreColumns / extractLifecycleFromRecord() in
 *     src/lib/sample-data/service-centre.ts exactly.
 *   - AN-CRM `FaultCode`/`SymptomCode`/`Solution`/`BOM` -> BusinessRecord rows
 *     under "service-centre-fault-codes" / "service-centre-symptom-codes" /
 *     "service-centre-solutions" / "inventory-bom" respectively, field keys
 *     matched to each module's own sample-data file.
 *   - A vendor's SUB-vendors (VendorProfile.parentVendorId -> this vendor)
 *     additionally become "service-centre-sc-profile" BusinessRecord rows
 *     under the parent's Partner (they are also Partners in their own right,
 *     since they are separate tenants — see the sub-SC section below).
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
//
// NOTE ON COLLECTION NAMES: each one below is pinned to what the real AN-CRM
// model actually resolves to, NOT to mongoose's default pluralization —
// src/models/BOM.ts explicitly sets `collection: "servicecenterboms"` (the
// model was renamed from ServiceCenterBOM without moving the data), so
// querying "boms" would silently read the unrelated manufacturing collection
// (or nothing at all) and migrate zero rows.
const looseSchema = () => new mongoose.Schema({}, { strict: false });

function model(name: string, collection: string) {
  return mongoose.model(name, looseSchema(), collection);
}

const BusinessModel = model("Business", "businesses");
const VendorProfileModel = model("VendorProfile", "vendorprofiles");
const CrmJobSheetModel = model("CrmJobSheet", "crmjobsheets");
const BrandModel = model("Brand", "brands");
const FaultCodeModel = model("FaultCode", "faultcodes");
const SymptomCodeModel = model("SymptomCode", "symptomcodes");
const SolutionModel = model("Solution", "solutions");
// src/models/BOM.ts: `{ timestamps: true, collection: "servicecenterboms" }`.
const BomModel = model("BOM", "servicecenterboms");
const SalesInvoiceModel = model("SalesInvoice", "salesinvoices");
const PaymentModel = model("Payment", "payments");
// Counted only — never migrated (see the counted-only block at the end of main()).
const InvoiceModel = model("Invoice", "invoices");
const AgreementModel = model("Agreement", "agreements");

/** Deterministic Partner.internalKey derived from the source VendorProfile _id — stable across re-runs, used as the upsert key. */
function toInternalKey(vendorProfileId: string): string {
  return `BIZ002-ANCRM-VP-${vendorProfileId}`;
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

// Migrated vendors become Partner rows of partnerTypeId "service-centre",
// whose idPrefix is "SC" (see PartnerType.idPrefix / src/lib/partnerData.ts) —
// so this migration-only allocator mirrors that prefix. High range (9000+) to
// avoid colliding with real SC#### ids assigned by the live signup path.
const partnerIdAllocator = makeIdAllocator("SC", 9000);

type Counts = Record<string, { seen: number; created: number; updated: number; skipped: number }>;

function bumpSeen(counts: Counts, key: string) {
  counts[key] ??= { seen: 0, created: 0, updated: 0, skipped: 0 };
  counts[key].seen += 1;
}

function bumpSkipped(counts: Counts, key: string) {
  counts[key] ??= { seen: 0, created: 0, updated: 0, skipped: 0 };
  counts[key].skipped += 1;
}

// ---------------------------------------------------------------------------
// AN-CRM -> My-Biz-Flow enum translation tables
// ---------------------------------------------------------------------------

/**
 * AN-CRM CrmJobSheet.status (src/models/CrmJobSheet.ts:31-43, enum on line 362)
 * is the milestone stepper:
 *   CREATED | REPAIR_STARTED | REPAIR_IN_PROGRESS | PART_PENDING |
 *   REPAIR_COMPLETED | CLOSED | CANCELLED
 *
 * My-Biz-Flow's MilestoneStatus (src/lib/sample-data/service-centre.ts:45-52)
 * is the SAME seven values — this lifecycle was ported from AN-CRM verbatim —
 * so the milestone carries over 1:1 with no translation at all. What DOES
 * need translating is the two coarser fields MBF's UI reads:
 *
 *   `stage`  -> WorkorderStage: "Created" | "In Progress" | "Completed" | "Closed"
 *               (+ the `onHold` side-state, which is how MBF represents
 *               PART_PENDING — see mapStageToMilestone(), which returns
 *               PART_PENDING for stage "In Progress" + onHold; this table is
 *               that function's inverse.)
 *   `status` -> the DataTable's display status: "Diagnosed" | "In repair" |
 *               "Ready" | "Delivered" | "On hold" (serviceCentreFormFields).
 *
 * There is no MBF stage for CANCELLED: it maps to the terminal stage
 * "Closed", and the untranslated truth is preserved verbatim in
 * `milestoneStatus` so nothing is lost.
 */
const JOB_STATUS_MAP: Record<
  string,
  { stage: "Created" | "In Progress" | "Completed" | "Closed"; onHold: boolean; status: string }
> = {
  CREATED: { stage: "Created", onHold: false, status: "Diagnosed" },
  REPAIR_STARTED: { stage: "In Progress", onHold: false, status: "In repair" },
  REPAIR_IN_PROGRESS: { stage: "In Progress", onHold: false, status: "In repair" },
  // PART_PENDING is a pause, not forward progress (CrmJobSheet.ts:35-39) —
  // MBF models exactly that as In Progress + onHold.
  PART_PENDING: { stage: "In Progress", onHold: true, status: "On hold" },
  REPAIR_COMPLETED: { stage: "Completed", onHold: false, status: "Ready" },
  CLOSED: { stage: "Closed", onHold: false, status: "Delivered" },
  // No MBF equivalent; terminal + on-hold display so a cancelled job never
  // reads as live work. milestoneStatus keeps the real value.
  CANCELLED: { stage: "Closed", onHold: true, status: "On hold" },
};

/**
 * AN-CRM CrmJobSheet.warrantyStatus (CrmJobSheet.ts:148 / schema line 334):
 * "IW" | "OOW" | "90_DAYS". My-Biz-Flow's WARRANTY_STATUSES
 * (service-centre.ts:75) is the identical triple, so warrantyStatus passes
 * through verbatim.
 *
 * MBF additionally has a coarse boolean `warrantyFlag` ("Under Warranty").
 * Per AN-CRM's core/catalog/warranty.ts isNonChargeableWarranty(), BOTH "IW"
 * and "90_DAYS" are non-chargeable warranty jobs (the 90-day out-of-box
 * goodwill warranty is treated exactly like in-warranty), so both set
 * warrantyFlag true. An unset warrantyStatus is genuinely unknown — flag
 * false (out of warranty / chargeable), which matches AN-CRM's own default
 * billing behaviour.
 */
function warrantyFlagFor(warrantyStatus: unknown): boolean {
  return warrantyStatus === "IW" || warrantyStatus === "90_DAYS";
}

/**
 * AN-CRM BOM.partType (BOM.ts:44/107): SPARE_PART | LABOUR | CONSUMABLE.
 * MBF's MATERIAL_TYPES (src/lib/sample-data/bom.ts): "Spare Part" |
 * "Consumable" | "Product (Finished Goods)".
 * MBF has no Labour material type — a labour BOM entry is still a priced
 * catalog line, so it lands in "Consumable" rather than being dropped. (The
 * distinction is not lost operationally: a LABOUR BOM line referenced from a
 * job sheet is split into a ServiceLine, not a PartLine — see
 * splitLineItems().)
 */
const BOM_PART_TYPE_MAP: Record<string, string> = {
  SPARE_PART: "Spare Part",
  LABOUR: "Consumable",
  CONSUMABLE: "Consumable",
};

/**
 * The vendor-visibility query AN-CRM's own vendor-facing routes use, mirrored
 * here so a migrated vendor gets exactly the catalog rows they can see in
 * AN-CRM today — no more (another vendor's private rows) and no less (the
 * platform-seeded global defaults).
 *
 * Two independent axes, both AND-ed (see src/app/api/fault-codes/route.ts
 * lines 69-98, and the identical blocks in symptom-codes/solutions/
 * service-center-bom routes):
 *   1. business scope: this vendor's own business, PLUS businessId:null,
 *      which means "a global (platform-seeded) code visible to every
 *      business" (FaultCode.ts top-of-file comment).
 *   2. vendor scope: `$or: [{ vendorId: own }, { vendorId: null }]` — the
 *      vendor's own private entries plus Super-Admin-added shared platform
 *      defaults. `{ vendorId: { $exists: false } }` is included too, exactly
 *      as service-center-bom/route.ts:143 does, to cover documents written
 *      before the field existed.
 *
 * The previous `{ businessId: biz._id }`-only query got this wrong in both
 * directions at once: it swept in EVERY vendor's private rows under a shared
 * Business, and dropped every global row.
 */
function vendorScopedCatalogQuery(businessId: unknown, vendorId: unknown) {
  return {
    $and: [
      { $or: [{ businessId }, { businessId: null }] },
      { $or: [{ vendorId }, { vendorId: null }, { vendorId: { $exists: false } }] },
    ],
  };
}

/**
 * AN-CRM keeps ONE `lineItems[]` array per job sheet
 * (ICrmJobSheetLineItem, CrmJobSheet.ts:45-74) — there are no separate
 * `partLines`/`serviceLines` arrays (the previous revision of this script
 * read those two non-existent fields, so every migrated job lost 100% of its
 * parts, labour and pricing).
 *
 * A line item has no explicit part-vs-service discriminator, so the split
 * uses the strongest real signal available, in order:
 *   1. The referenced BOM entry's partType — LABOUR means a service line.
 *      (`serviceCenterBOMId`, CrmJobSheet.ts:64; partTypeByBomId is prebuilt
 *      from this vendor's BOM rows.)
 *   2. Failing that, a line with no material identity at all (no
 *      materialCode, no BOM ref, no hsnCode) but a `solutionId` is labour —
 *      that is exactly the shape a hand-typed "Work performed" charge takes.
 *   3. Everything else is a part line (the default a physical repair line
 *      takes, and the safer bucket: a part line retains qty/unitPrice/tax,
 *      whereas a service line flattens to one laborCharge).
 *
 * Targets are PartLine / ServiceLine in src/lib/sample-data/service-centre.ts
 * (lines 80-118).
 */
function splitLineItems(
  lineItems: any[],
  partTypeByBomId: Map<string, string>,
  jobKey: string
): { partLines: Record<string, unknown>[]; serviceLines: Record<string, unknown>[] } {
  const partLines: Record<string, unknown>[] = [];
  const serviceLines: Record<string, unknown>[] = [];

  lineItems.forEach((li, index) => {
    const bomId = li?.serviceCenterBOMId ? String(li.serviceCenterBOMId) : "";
    const bomPartType = bomId ? partTypeByBomId.get(bomId) : undefined;
    const hasMaterialIdentity = Boolean(li?.materialCode || bomId || li?.hsnCode);
    const isLabour = bomPartType === "LABOUR" || (!hasMaterialIdentity && Boolean(li?.solutionId));

    // AN-CRM line items are subdocuments with `_id: false` (CrmJobSheet.ts:302),
    // so there is no per-line id to carry over — derive a stable one from the
    // job's recordKey + index, which is deterministic across re-runs.
    const id = `${jobKey}-L${index + 1}`;
    const quantity = Number(li?.quantity ?? 1);
    const unitPrice = Number(li?.unitPrice ?? 0);

    if (isLabour) {
      serviceLines.push({
        id,
        solutionId: li?.solutionId ? String(li.solutionId) : "",
        // AN-CRM stores the free-text line `description`; the catalog label
        // would need a Solution lookup per line, so the description (which is
        // what actually prints on the job sheet) is used as the label.
        solutionLabel: String(li?.description ?? ""),
        // ServiceLine flattens to a single charge: cost is the stored pre-tax
        // line total (CrmJobSheet.ts:63), falling back to qty * unitPrice.
        laborCharge: Number(li?.cost ?? quantity * unitPrice),
        faultCodeId: li?.faultCodeId ? String(li.faultCodeId) : undefined,
        symptomCodeId: li?.symptomCodeId ? String(li.symptomCodeId) : undefined,
        taxRate: Number(li?.taxRate ?? 0),
        hsnCode: li?.hsnCode ?? undefined,
      });
      return;
    }

    partLines.push({
      id,
      // MBF's materialId is the BOM row's identity; AN-CRM's own printed
      // job sheet uses the materialCode snapshot (CrmJobSheet.ts:58), which
      // is also what the migrated BOM rows use as their `id` — so preferring
      // materialCode keeps the two sides referentially consistent.
      materialId: String(li?.materialCode ?? bomId ?? ""),
      materialLabel: String(li?.description ?? ""),
      qty: quantity,
      // AN-CRM tracks serialization on the BOM entry (BOM.isSerialized), not
      // on the job-sheet line, and does not snapshot the consumed serial onto
      // the line — so this is false and `serial` stays unset rather than
      // inventing a value.
      serialized: false,
      faultCodeId: li?.faultCodeId ? String(li.faultCodeId) : undefined,
      symptomCodeId: li?.symptomCodeId ? String(li.symptomCodeId) : undefined,
      solutionId: li?.solutionId ? String(li.solutionId) : undefined,
      unit: li?.unit ?? undefined,
      unitPrice,
      taxRate: Number(li?.taxRate ?? 0),
      hsnCode: li?.hsnCode ?? undefined,
    });
  });

  return { partLines, serviceLines };
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (will write to Postgres)" : "DRY RUN (no Postgres writes)"}`);
  await mongoose.connect(AN_CRM_MONGO_URI!, { serverSelectionTimeoutMS: 10_000 });
  console.log("Connected to AN-CRM MongoDB (read-only).");

  const counts: Counts = {};

  try {
    // Businesses are looked up by id only — they are NOT tenants here (see
    // the tenancy note at the top of this file); a vendor's Business supplies
    // fallback address/contact details when the vendor's own are blank.
    const businesses = await BusinessModel.find({}).lean();
    const businessById = new Map(businesses.map((b) => [String(b._id), b]));
    const businessIdsWithVendors = new Set<string>();

    // 1) VendorProfiles -> Partner rows (one tenant each) --------------------
    const vendors = await VendorProfileModel.find({ isDeleted: { $ne: true } }).lean();

    // Every vendor's short SC-#### sc-profile id is pre-resolved across the
    // WHOLE run, not per-parent, so a sub-vendor's parentScId cross-reference
    // always resolves even though parent and child are migrated separately.
    const scProfileIdAllocator = makeIdAllocator("SC-", 1);
    for (const vp of vendors) scProfileIdAllocator.resolve(String(vp._id));

    for (const vendor of vendors) {
      const vendorId = vendor._id;
      const vendorKey = String(vendorId);
      const businessId = vendor.businessId ?? null;
      if (businessId) businessIdsWithVendors.add(String(businessId));
      const biz = businessId ? businessById.get(String(businessId)) : undefined;

      bumpSeen(counts, "Partner (VendorProfile)");
      const internalKey = toInternalKey(vendorKey);
      const partnerId = partnerIdAllocator.resolve(vendorKey);

      // VendorProfile field names verified against src/models/VendorProfile.ts:
      //   companyName (line 158/410), gstNumber (191/427), panNumber (192/434),
      //   bankAccountName/bankAccountNumber/bankIFSC (317-319/487-489),
      //   address.{street,city,state,pincode} (162-168), rating (321/491),
      //   status (322/492, the onboarding enum), parentVendorId (88/390).
      const vendorAddress = (vendor.address ?? {}) as Record<string, unknown>;
      const partnerData = {
        id: partnerId,
        internalKey,
        businessId: "BIZ002",
        partnerTypeId: DEFAULT_PARTNER_TYPE_ID,
        businessName: String(vendor.companyName ?? biz?.name ?? "Migrated Service Centre"),
        addressLine: (vendorAddress.street as string | undefined) ?? null,
        city: String(vendorAddress.city ?? biz?.city ?? ""),
        state: String(vendorAddress.state ?? biz?.state ?? ""),
        pincode: String(vendorAddress.pincode ?? biz?.pincode ?? ""),
        gstin: (vendor.gstNumber as string | undefined) ?? null,
        businessEmail: String(vendor.email ?? biz?.email ?? ""),
        businessContact: String(vendor.phone ?? biz?.phone ?? ""),
        loginContact: String(vendor.email ?? vendor.phone ?? vendorKey),
        // A real run must generate + email a fresh password per Partner's own
        // signup flow, never fabricate a hash here — left as a placeholder
        // that forces mustChangePassword and blocks login until reset.
        passwordHash: "MIGRATION_PLACEHOLDER_REQUIRES_PASSWORD_RESET",
        mustChangePassword: true,
        // AN-CRM VendorStatus (VendorProfile.ts:40+) has 11 onboarding values;
        // only ACTIVE/APPROVED are live tenants. Everything else (APPLIED,
        // PENDING, AGREEMENT_*, REJECTED, SUSPENDED, INACTIVE) migrates as an
        // Inactive Partner so half-onboarded vendors can't log in.
        status: vendor.status === "ACTIVE" || vendor.status === "APPROVED" ? "Active" : "Inactive",
        subscriptionStatus: "Trial",
      };

      if (APPLY) {
        const existing = await prisma.partner.findUnique({ where: { internalKey } });
        await prisma.partner.upsert({
          where: { internalKey },
          create: partnerData,
          update: {
            businessName: partnerData.businessName,
            city: partnerData.city,
            state: partnerData.state,
            status: partnerData.status,
          },
        });
        if (existing) counts["Partner (VendorProfile)"].updated += 1;
        else counts["Partner (VendorProfile)"].created += 1;
      } else {
        counts["Partner (VendorProfile)"].created += 1; // would-create, in dry-run terms
      }

      // 2) This VENDOR's CrmJobSheets -> "service-centre" BusinessRecords ----
      // Scoped by vendorId, not just businessId — see the tenancy note above.
      const jobSheets = await CrmJobSheetModel.find({
        businessId,
        vendorId,
        isDeleted: { $ne: true },
      }).lean();

      // Brand is an ObjectId ref on the job sheet (CrmJobSheet.ts:111,
      // `brandId: { ref: "Brand" }`) — NOT a flat brandName string. Resolve
      // the referenced Brand.name (src/models/Brand.ts:6/58) in one batched
      // query per vendor rather than N lookups, falling back to
      // pendingBrandName (CrmJobSheet.ts:118 — the free-text stand-in used
      // while a "Request to add brand" is awaiting approval).
      const brandIds = [...new Set(jobSheets.map((j) => (j.brandId ? String(j.brandId) : "")).filter(Boolean))];
      const brands = brandIds.length
        ? await BrandModel.find({ _id: { $in: brandIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean()
        : [];
      const brandNameById = new Map(brands.map((b) => [String(b._id), String(b.name ?? "")]));

      // BOM partType lookup, used by splitLineItems() to tell a labour line
      // from a part line. Same vendor-visible scope as the BOM migration below.
      const vendorBoms = await BomModel.find(vendorScopedCatalogQuery(businessId, vendorId))
        .select({ partType: 1 })
        .lean();
      const partTypeByBomId = new Map(vendorBoms.map((b) => [String(b._id), String(b.partType ?? "SPARE_PART")]));

      for (const job of jobSheets) {
        bumpSeen(counts, "service-centre (JobSheet)");
        const recordKey = String(job._id);
        const brandName = job.brandId
          ? brandNameById.get(String(job.brandId)) || (job.pendingBrandName as string | undefined)
          : (job.pendingBrandName as string | undefined);
        // CrmJobSheet.deviceModel (line 119) is the display string; there is
        // no `modelName` field.
        const modelName = (job.deviceModel as string | undefined) ?? undefined;
        const milestoneStatus = String(job.status ?? "CREATED");
        const lifecycle = JOB_STATUS_MAP[milestoneStatus] ?? JOB_STATUS_MAP.CREATED;
        const { partLines, serviceLines } = splitLineItems(
          Array.isArray(job.lineItems) ? job.lineItems : [],
          partTypeByBomId,
          recordKey
        );

        const data = {
          // CrmJobSheet.jobSheetNumber (line 84/309) — there is no `jobNumber`.
          id: String(job.jobSheetNumber ?? recordKey),
          customer: String(job.customerName ?? ""),
          // `product` is AN-CRM's free-text device/category field (line 107);
          // brand + model is the better display string when both are known.
          device: String([brandName, modelName].filter(Boolean).join(" ") || job.product || ""),
          brandName: brandName || undefined,
          modelName,
          // CrmJobSheet.assignedToName (line 174/350) IS a flat string — a
          // deliberate snapshot of the engineer's name taken at assignment
          // time "so the printed job sheet/invoice always shows a readable
          // engineer name without needing a populate". Written to both keys:
          // serviceCentreRows uses `technician`, the detail view and
          // extractLifecycleFromRecord() use `technicianName`.
          technician: (job.assignedToName as string | undefined) || undefined,
          technicianName: (job.assignedToName as string | undefined) || undefined,
          technicianId: job.assignedTo ? String(job.assignedTo) : undefined,
          assignedAt: job.engineerAssignedAt ?? undefined,
          // AN-CRM has no per-job priority field; MBF's column is required, so
          // every migrated job takes the neutral default.
          priority: "Medium",
          status: lifecycle.status,
          receivedDate: job.createdAt ?? new Date().toISOString(),
          warrantyFlag: warrantyFlagFor(job.warrantyStatus),
          // AN-CRM scopes a job to a Warehouse, not a named branch
          // (CrmJobSheet.ts:88); there is no branch name to carry over.
          branch: undefined,

          // Milestone lifecycle — matches extractLifecycleFromRecord() /
          // mapStageToMilestone() in src/lib/sample-data/service-centre.ts.
          stage: lifecycle.stage,
          onHold: lifecycle.onHold,
          holdReason: milestoneStatus === "CANCELLED" ? (job.cancelReason as string | undefined) : undefined,
          holdSince: milestoneStatus === "PART_PENDING" ? (job.partPendingAt ?? undefined) : undefined,
          // The seven-value AN-CRM enum is MBF's MilestoneStatus verbatim —
          // kept untranslated so nothing (CANCELLED especially) is lost in
          // the coarser stage/status fields above.
          milestoneStatus,
          estimateApproved: Boolean(job.estimateGenerated),
          invoiceId: job.invoiceNumber ?? (job.invoiceId ? String(job.invoiceId) : undefined),

          imeiOrSerialNumber: (job.imeiOrSerialNumber as string | undefined) ?? undefined,
          // IW / OOW / 90_DAYS — identical enum on both sides.
          warrantyStatus: (job.warrantyStatus as string | undefined) ?? undefined,
          appointmentType: job.appointmentType === "WALKIN" ? "Walk-in" : job.appointmentType === "ONSITE" ? "Onsite" : undefined,
          deviceAppearance: job.deviceAppearance
            ? String(job.deviceAppearance).charAt(0) + String(job.deviceAppearance).slice(1).toLowerCase()
            : undefined,
          issueDescription: (job.issueDescription as string | undefined) ?? undefined,
          internalNotes: (job.internalNotes as string | undefined) ?? undefined,
          standardAccessories: (job.standardAccessories as string | undefined) ?? undefined,
          fileBackupDescription: (job.fileBackupDescription as string | undefined) ?? undefined,
          handoverNotes: (job.workPerformed as string | undefined) ?? undefined,
          partLines,
          serviceLines,

          // NOT POPULATED — verified absent from src/models/CrmJobSheet.ts:
          // estimatedAmount, estimatedCost, actualCost, odometerReading,
          // customerNotes, slaDate, warrantyExpiryDate. AN-CRM has no
          // estimate/costing fields on the job sheet at all (money lives on
          // the SalesInvoice created at closure, plus the flat
          // `serviceCharge`), no odometer, no customer-visible notes field,
          // no SLA/promised-delivery date and no warranty expiry date. These
          // MBF fields are deliberately left unset rather than defaulted to
          // a fabricated 0/blank, so an empty cell reads as "not migrated"
          // instead of "genuinely zero".
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

      // 3) Catalogs visible to this vendor: FaultCode/SymptomCode/Solution/BOM
      // FaultCode fields verified in src/models/FaultCode.ts: code (56),
      // description (57), deviceCategory (58 — SINGULAR, one value; there is
      // no `deviceCategoryScope` array), category (59), parentId (60 — an
      // ObjectId ref to another FaultCode), isActive (61).
      await migrateCatalog(FaultCodeModel, businessId, vendorId, partnerId, "service-centre-fault-codes", counts, (doc, byId) => ({
        id: String(doc.code ?? doc._id),
        description: String(doc.description ?? ""),
        category: doc.category ?? undefined,
        // MBF's field is array-shaped (multi-chip column); AN-CRM's is one
        // optional value — wrap it rather than emitting a permanently empty
        // array, which is what the old `deviceCategoryScope` read produced.
        deviceCategoryScope: doc.deviceCategory ? [String(doc.deviceCategory)] : [],
        // parentId is an ObjectId; MBF's column shows a parent fault CODE, so
        // resolve it to the parent's own migrated id (its `code`).
        parentId: doc.parentId ? String(byId.get(String(doc.parentId))?.code ?? "") : "",
        isActive: doc.isActive === false ? "Inactive" : "Active",
      }));

      // SymptomCode: identical field set to FaultCode (src/models/SymptomCode.ts:37-43).
      await migrateCatalog(SymptomCodeModel, businessId, vendorId, partnerId, "service-centre-symptom-codes", counts, (doc, byId) => ({
        id: String(doc.code ?? doc._id),
        description: String(doc.description ?? ""),
        category: doc.category ?? undefined,
        deviceCategoryScope: doc.deviceCategory ? [String(doc.deviceCategory)] : [],
        parentId: doc.parentId ? String(byId.get(String(doc.parentId))?.code ?? "") : "",
        isActive: doc.isActive === false ? "Inactive" : "Active",
      }));

      // Solution (src/models/Solution.ts) has exactly: code, description,
      // category, isActive. It has NO `name`, and no estimatedRepairMinutes /
      // standardLaborCost / deviceCategoryScope — those are MBF-only
      // future-proofing fields (see the header comment in
      // src/lib/sample-data/solutions.ts) and are left unset.
      //
      // MBF's solutions module reads `title` (solutionsColumns) and filters on
      // `status === "Active"` (a STRING, not a boolean `isActive`) — writing
      // `name`/`isActive` as the old revision did left every migrated solution
      // blank-titled and mislabelled in the UI.
      await migrateCatalog(SolutionModel, businessId, vendorId, partnerId, "service-centre-solutions", counts, (doc) => ({
        id: String(doc.code ?? doc._id),
        title: String(doc.description ?? ""),
        category: doc.category ?? undefined,
        status: doc.isActive === false ? "Inactive" : "Active",
        moduleSlug: "service-centre",
      }));

      // BOM fields verified in src/models/BOM.ts: partCode (67/105),
      // partName (65/104), description (68/106 — a SEPARATE detail field,
      // per that model's own "Material Description -> partName + description"
      // mapping note), partType (69/107), unit (70/108), hsnCode (71/109),
      // gstRate (72/110 — NOT `taxPercent`), rate (73/111),
      // warrantyDays (74/112), isSerialized (80/113 — NOT `serialized`).
      await migrateCatalog(BomModel, businessId, vendorId, partnerId, "inventory-bom", counts, (doc) => ({
        id: String(doc.partCode ?? doc._id),
        description: [doc.partName, doc.description].filter(Boolean).join(" — "),
        hsnCode: doc.hsnCode ?? undefined,
        type: BOM_PART_TYPE_MAP[String(doc.partType ?? "SPARE_PART")] ?? "Spare Part",
        uom: doc.unit ?? undefined,
        rate: Number(doc.rate ?? 0),
        // BOM.rate is explicitly "without tax" (BOM.ts:73).
        rateType: "Without Tax",
        taxPercent: Number(doc.gstRate ?? 18),
        serialized: Boolean(doc.isSerialized),
        status: doc.isActive === false ? "Inactive" : "Active",
        warrantyPeriodDays: doc.warrantyDays ?? undefined,
        // NOT POPULATED — AN-CRM's BOM model has no barcode, mrp, category,
        // reorderLevel, supplierRef or batchNumber field.
      }));

      // 4) This vendor's SUB-vendors -> "service-centre-sc-profile" ----------
      // VendorProfile.parentVendorId (VendorProfile.ts:88/390) is how a
      // sub-vendor points at its parent. A sub-vendor is itself a tenant, so
      // it ALSO gets its own Partner from the top-level loop above; this
      // record is the parent's roster view of it (see
      // src/lib/sample-data/service-centre-sc-profile.ts on why the roster is
      // NOT folded into Partner).
      const subVendors = await VendorProfileModel.find({
        parentVendorId: vendorId,
        isDeleted: { $ne: true },
      }).lean();
      for (const vp of subVendors) {
        bumpSeen(counts, "service-centre-sc-profile");
        const recordKey = String(vp._id);
        const subAddress = (vp.address ?? {}) as Record<string, unknown>;
        const data = {
          id: scProfileIdAllocator.resolve(recordKey),
          // companyName, NOT businessName (VendorProfile.ts:158/410).
          businessName: String(vp.companyName ?? ""),
          // AN-CRM has no separate `onboardingStatus` field — `status` IS the
          // onboarding enum (APPLIED/PENDING/AGREEMENT_*/APPROVED/ACTIVE/...,
          // VendorProfile.ts:492-498), which is the same vocabulary MBF's
          // scProfileRows use for onboardingStatus.
          onboardingStatus: vp.status ?? "APPLIED",
          parentScId: vp.parentVendorId ? scProfileIdAllocator.resolve(String(vp.parentVendorId)) : "",
          gstin: (vp.gstNumber as string | undefined) ?? undefined,
          pan: (vp.panNumber as string | undefined) ?? undefined,
          // bankAccountName/bankAccountNumber/bankIFSC are correct as-is
          // (VendorProfile.ts:317-319/487-489).
          bankAccountName: vp.bankAccountName ?? undefined,
          bankAccountNumber: vp.bankAccountNumber ?? undefined,
          bankIFSC: vp.bankIFSC ?? undefined,
          // No `serviceArea` free-text field exists; servicePincodes
          // (VendorProfile.ts:354/515) is the real coverage list.
          serviceArea: Array.isArray(vp.servicePincodes) && vp.servicePincodes.length
            ? vp.servicePincodes.join(", ")
            : [subAddress.city, subAddress.state].filter(Boolean).join(", ") || undefined,
          rating: vp.rating ?? undefined,
          status: vp.status === "ACTIVE" || vp.status === "APPROVED" ? "Active" : "Inactive",
          moduleSlug: "service-centre",
          // NOT POPULATED — AN-CRM's VendorProfile has no serviceRadiusKm,
          // kycDocRef or agreementDocRef field. (`agreementId` exists but is
          // an ObjectId ref to an Agreement document, not a doc reference
          // string, and Agreement is not migrated in this pass.)
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

      // 5) This VENDOR's SalesInvoices -> "billing" BusinessRecords ----------
      // SalesInvoice carries a real `vendorId` (src/models/SalesInvoice.ts:98/206,
      // ref VendorProfile), so it is scoped by vendorId here for exactly the
      // same reason job sheets are: a businessId-only query would merge every
      // vendor's invoices under a shared Business into one Partner's books.
      //
      // A SalesInvoice with N Payments maps to 1 "billing" record + N
      // "billing-payments" records — src/lib/sample-data/billing-payments.ts
      // models Payments as their own module linked by invoiceId, with an
      // invoice's paid/balance computed from its linked payments
      // (getInvoiceBalance()) rather than stored as a single field, so
      // partial-payment history survives intact.
      const salesInvoices = await SalesInvoiceModel.find({ businessId, vendorId }).lean();
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
        // SalesInvoice.status (SalesInvoice.ts:137/263): DRAFT | SENT | PAID |
        // OVERDUE | CANCELLED | FAILED | PARTIAL -> MBF's billing paymentStatus.
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
          // Field names verified in src/models/SalesInvoice.ts: subtotal (119/249),
          // taxTotal (120/250), grandTotal (122/252), paidAmount (163/277),
          // paymentMethod (164/278), invoiceNumber (85/192).
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
        // AN-CRM's Payment model (src/models/Payment.ts) has NO vendorId and
        // stores invoiceId as a free-text String (not necessarily the Mongo
        // _id), so match defensively on both the _id hex and the invoice
        // number. businessId is AND-ed in because invoiceNumber's counter is
        // per-vendor (CrmJobSheet.ts:413-424 documents the same per-vendor
        // numbering), so a bare invoiceId string match could otherwise pull
        // in another tenant's payment that happens to share a number.
        // Vendor isolation itself comes from only ever asking about THIS
        // vendor's own invoices.
        const payments = await PaymentModel.find({
          businessId: String(businessId ?? ""),
          $or: [
            { invoiceId: recordKey },
            ...(inv.invoiceNumber ? [{ invoiceId: String(inv.invoiceNumber) }] : []),
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

    // Businesses with no VendorProfile attached are Brand/POS/Sales tenants,
    // not service centres — reported so the summary accounts for every source
    // Business rather than silently ignoring them.
    for (const biz of businesses) {
      bumpSeen(counts, "Business (source; non-SC skipped)");
      if (!businessIdsWithVendors.has(String(biz._id))) {
        bumpSkipped(counts, "Business (source; non-SC skipped)");
      }
    }

    // Invoice.ts is AN-CRM's older ecommerce/order invoice model, superseded
    // by SalesInvoice (see SalesInvoice.ts's own top comment) — any business
    // still on it has already been folded into SalesInvoice going forward, so
    // it's counted only, not migrated separately, to avoid duplicate invoice
    // records. Agreement stays excluded per explicit scope.
    //
    // Both are counted business-wide, NOT per vendor: neither model has a
    // vendorId field at all (verified in src/models/Invoice.ts and
    // Agreement.ts — businessId only), so on a shared Business they cannot be
    // attributed to one vendor from the document itself. Counting them
    // per-vendor would report the same rows once per vendor and imply an
    // attribution that doesn't exist.
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
    console.log(`${entity.padEnd(48)} seen=${c.seen}  created=${c.created}  updated=${c.updated}  skipped=${c.skipped}`);
  }
  if (!APPLY) {
    console.log("\nDry run only — no Postgres writes were made. Re-run with --apply to write.");
  }
}

/**
 * Shared helper for the four vendor-visible catalogs
 * (FaultCode/SymptomCode/Solution/BOM) — same upsert shape, different
 * moduleSlug/mapper. Scoping is vendorScopedCatalogQuery()'s, mirroring
 * AN-CRM's own vendor-facing routes.
 *
 * `mapDoc` receives the whole fetched set keyed by _id as its second
 * argument, so a mapper can resolve an intra-catalog ObjectId reference
 * (FaultCode/SymptomCode `parentId`) to the parent's migrated id without an
 * extra per-row query.
 */
async function migrateCatalog(
  model: mongoose.Model<any>,
  mongoBusinessId: unknown,
  mongoVendorId: unknown,
  partnerId: string,
  moduleSlug: string,
  counts: Counts,
  mapDoc: (doc: any, byId: Map<string, any>) => Record<string, unknown>
) {
  const docs = await model.find(vendorScopedCatalogQuery(mongoBusinessId, mongoVendorId)).lean();
  const byId = new Map(docs.map((d: any) => [String(d._id), d]));
  for (const doc of docs) {
    bumpSeen(counts, moduleSlug);
    const recordKey = String(doc._id);
    const data = mapDoc(doc, byId);
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
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
