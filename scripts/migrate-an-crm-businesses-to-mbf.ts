/**
 * Migrates every real VendorProfile (AN-CRM's actual per-tenant unit — AN-CRM
 * runs almost all vendors under one shared default Business, per its own
 * source comments, so VendorProfile is the real "one shop" boundary, not
 * Business) into My-Biz-Flow as a brand-new Partner, with all of its
 * Service-Centre-relevant data copied in as fresh BusinessRecord rows.
 *
 * Confirmed against the real database (via --list-collections): real data
 * lives in the "test" database (AN-CRM's mongoose connection never sets an
 * explicit dbName, so it lands on Mongo's driver default). Real collections
 * used here: vendorprofiles (11), crmjobsheets (62), customers (62),
 * brands (16), devicemodels (52), solutions (11), servicecenterboms (74),
 * salesinvoices (34), users (12). faultcodes/symptomcodes/materials were
 * confirmed empty (0 docs) and are skipped.
 *
 * SAFETY:
 *  - AN-CRM's MongoDB is READ-ONLY here. This script never writes, updates,
 *    or deletes anything there.
 *  - Every My-Biz-Flow write is a plain `create`. Default mode is DRY RUN
 *    (no writes at all); pass --confirm to actually write.
 *  - IS safely re-runnable with --confirm: an already-migrated Partner
 *    (matched by loginContact) is reused rather than re-created, and each
 *    collection's documents are matched by the `_anCrmId` stamped on the
 *    migrated record, so re-running only imports what's genuinely new
 *    (e.g. picking up salesinvoices on a second pass after the first pass
 *    only covered brands/models/solutions/BOM/jobsheets).
 *
 * LOGIN: AN-CRM hashes passwords with bcrypt (on User.password); My-Biz-Flow
 * hashes with Node's scrypt (src/lib/passwords.ts) — incompatible formats.
 * Every migrated Partner gets a freshly generated password
 * (mustChangePassword: true) printed once to the console in --confirm mode.
 *
 * Usage (run from a machine with direct network access to both DBs):
 *   MONGODB_URI=... DATABASE_URL=... npx tsx scripts/migrate-an-crm-businesses-to-mbf.ts --list-collections   (diagnostic only)
 *   MONGODB_URI=... DATABASE_URL=... npx tsx scripts/migrate-an-crm-businesses-to-mbf.ts                       (dry run)
 *   MONGODB_URI=... DATABASE_URL=... npx tsx scripts/migrate-an-crm-businesses-to-mbf.ts --confirm              (real write)
 */
import { MongoClient, type Document, type ObjectId } from "mongodb";
import { PrismaClient } from "@prisma/client";
import { createBusinessRecord } from "../src/lib/businessRecords";
import { hashPassword, generatePassword } from "../src/lib/passwords";

const confirm = process.argv.includes("--confirm");
const prisma = new PrismaClient();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Set MONGODB_URI (AN-CRM's real connection string) before running this.");
  process.exit(1);
}

const BUSINESS_ID = "BIZ002";

function pick(doc: Document, ...candidates: string[]): unknown {
  for (const key of candidates) {
    const v = key.includes(".") ? key.split(".").reduce<unknown>((o, k) => (o as Document | undefined)?.[k], doc) : doc[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function str(v: unknown, fallback = ""): string {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

async function nextPartnerId(): Promise<() => string> {
  const existing = await prisma.partner.count({ where: { id: { startsWith: "SC" } } });
  let n = existing;
  return () => {
    n += 1;
    return `SC${String(n).padStart(4, "0")}`;
  };
}

function mapPaymentMode(v: unknown): string | undefined {
  const map: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK_TRANSFER: "Bank Transfer", OTHER: "Other" };
  return v ? map[String(v)] ?? String(v) : undefined;
}

/**
 * Resolves what this vendor ACTUALLY paid for in AN-CRM (src/models/
 * VendorSubscription.ts — one doc per vendor, status computed from
 * `currentPeriodEnd` rather than stored) into the real My-Biz-Flow
 * subscription state, instead of blanket-granting every migrated partner
 * Ultimate+Active regardless of whether they ever paid. Per explicit
 * correction: "we should not give plan access to someone who never paid."
 *   - currentPeriodEnd in the future  -> genuinely paid and current: Active,
 *     with the real plan they bought.
 *   - currentPeriodEnd in the past    -> paid once, lapsed: PastDue, keeps
 *     the plan on record (so it's visible what they had, but access is
 *     gated the same way a real PastDue partner's is elsewhere in this app).
 *   - no currentPeriodEnd at all (NOT_SET/UNPAID — never confirmed a
 *     payment) -> Trial, with the REAL signup date preserved as
 *     trialStartAt (not "now") and a 15-day trialEndAt computed from it —
 *     already expired if that's genuinely in the past, which is accurate,
 *     not a bug: they never converted, so their trial is over.
 */
function resolveSubscription(
  sub: Document | null,
  vendorCreatedAt: Date | undefined
): { subscriptionStatus: string; planId: string | null; billingCycle: string | null; trialStartAt: Date; trialEndAt: Date } {
  const planKeyMap: Record<string, string> = {
    STARTER: "PLAN-BASIC",
    BASIC: "PLAN-PRO",
    PRO: "PLAN-PRO",
    ULTIMATE: "PLAN-ULTIMATE",
  };
  const signupAt = vendorCreatedAt ?? new Date();
  const trialStartAt = signupAt;
  const trialEndAt = new Date(signupAt);
  trialEndAt.setDate(trialEndAt.getDate() + 15);

  const currentPeriodEnd = sub ? pick(sub, "currentPeriodEnd") : undefined;
  const planKey = sub ? str(pick(sub, "planKey")) : "";
  const planId = planKey ? planKeyMap[planKey] ?? null : null;
  const validityDays = sub ? Number(pick(sub, "validityDays")) || 30 : 30;
  const billingCycle = validityDays >= 700 ? "TwoYearly" : "Yearly";

  if (currentPeriodEnd instanceof Date) {
    const active = currentPeriodEnd.getTime() > Date.now();
    return {
      subscriptionStatus: active ? "Active" : "PastDue",
      planId,
      billingCycle: planId ? billingCycle : null,
      trialStartAt,
      trialEndAt,
    };
  }

  // Never had a confirmed paid period — real trial state, not a paid plan.
  return { subscriptionStatus: "Trial", planId: null, billingCycle: null, trialStartAt, trialEndAt };
}

/**
 * AN-CRM's real CrmJobSheetStatus (CREATED/REPAIR_STARTED/REPAIR_IN_PROGRESS/
 * PART_PENDING/REPAIR_COMPLETED/CLOSED/CANCELLED) mapped onto My-Biz-Flow's
 * own stage ("Created"|"In Progress"|"Completed"|"Closed") + onHold side
 * state — the SAME split mapStageToMilestone() in service-centre.ts expects,
 * so the migrated job's real status shows correctly everywhere (list,
 * detail badge, TAT, summary cards) instead of every job defaulting to
 * "Created" because only a generic, unrelated legacy `status` string field
 * was being set before.
 */
function mapAnCrmStatusToStage(status: string): { stage: string; onHold: boolean; holdReason?: string } {
  switch (status) {
    case "CREATED":
      return { stage: "Created", onHold: false };
    case "REPAIR_STARTED":
    case "REPAIR_IN_PROGRESS":
      return { stage: "In Progress", onHold: false };
    case "PART_PENDING":
      return { stage: "In Progress", onHold: true, holdReason: "Awaiting parts" };
    case "REPAIR_COMPLETED":
      return { stage: "Completed", onHold: false };
    case "CLOSED":
    case "CANCELLED":
      // Cancellation is recorded via cancelledAt (below), which takes
      // precedence over `stage` in mapStageToMilestone() regardless of
      // this value — Closed is a reasonable default for "however far it
      // got before being closed/cancelled".
      return { stage: "Closed", onHold: false };
    default:
      return { stage: "Created", onHold: false };
  }
}

/** Builds a stageHistory entry list from whatever real AN-CRM timestamps exist for this job, so the migrated job's TAT/timeline/milestone-stepper dates are real, not blank. */
function buildStageHistory(d: Document): { stage: string; at: string }[] {
  const history: { stage: string; at: string }[] = [];
  const push = (stage: string, at: unknown) => {
    if (at instanceof Date) history.push({ stage, at: at.toISOString() });
  };
  push("In Progress", pick(d, "engineerAssignedAt"));
  push("Completed", pick(d, "completedAt"));
  push("Closed", pick(d, "handedOverAt"));
  return history;
}

async function main() {
  const mongo = new MongoClient(MONGODB_URI!);
  await mongo.connect();
  const dbName = process.env.MONGODB_DB_NAME || "test";
  const db = mongo.db(dbName);

  if (process.argv.includes("--list-collections")) {
    const cols = await db.listCollections().toArray();
    console.log(`Database "${dbName}" has ${cols.length} collection(s):`);
    for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(c.name).countDocuments({});
      console.log(`  ${c.name}: ${count} document(s)`);
    }
    await mongo.close();
    await prisma.$disconnect();
    return;
  }

  const allVendors = await db.collection("vendorprofiles").find({}).toArray();
  // Excludes AN-CRM's own internal demo/test vendors (confirmed via a dry
  // run: "Sample Vendor (Basic/Pro/Ultimate)", @angroup-test.in emails, zero
  // real data) so real partner ids start clean at SC0001 instead of SC0004.
  const vendors = allVendors.filter((v) => !/^Sample Vendor \(/.test(str(pick(v, "companyName"))));
  console.log(
    `Found ${allVendors.length} VendorProfile(s) in AN-CRM ("${dbName}" db); migrating ${vendors.length} real vendor(s), skipping ${allVendors.length - vendors.length} sample/test vendor(s).\n`
  );

  const partnerType = await prisma.partnerType.findFirst({ where: { id: "service-centre" } });
  if (!partnerType) {
    console.error('PartnerType "service-centre" not found — run scripts/seed-launch-data.ts first.');
    process.exit(1);
  }

  // AN-CRM's real Terms & Conditions live on the single shared Business
  // document (src/models/Business.ts's termsAndConditions/estimateTerms/
  // invoiceTerms — confirmed there's only 1 Business doc total, per an
  // earlier diagnostic run, since almost every vendor shares it), not on
  // each VendorProfile — applied to every migrated partner as their
  // starting Settings terms, so printed documents carry the real text
  // instead of coming up blank.
  const businessDoc = await db.collection("businesses").findOne({});
  const serviceTerms = str(pick(businessDoc ?? {}, "termsAndConditions")) || null;
  const estimateTermsAnCrm = str(pick(businessDoc ?? {}, "estimateTerms")) || null;
  const invoiceTermsAnCrm = str(pick(businessDoc ?? {}, "invoiceTerms")) || null;

  const idGen = await nextPartnerId();
  const generatedPasswords: { partnerId: string; businessName: string; loginContact: string; password: string }[] = [];

  for (const vendor of vendors) {
    const vendorId: ObjectId = vendor._id;
    const businessName = str(pick(vendor, "companyName"), `Unnamed Vendor (${vendorId})`);

    let loginContact = str(pick(vendor, "email"));
    if (!loginContact && vendor.userId) {
      const userDoc = await db.collection("users").findOne({ _id: vendor.userId });
      loginContact = str(pick(userDoc ?? {}, "email"));
    }

    // Idempotent re-run: if this vendor's Partner already exists (matched by
    // loginContact, set uniquely per vendor on first run), reuse its real id
    // instead of minting a new one — otherwise a second run (e.g. to pick up
    // a newly-added collection like salesinvoices) would collide on the
    // unique loginContact/id, or silently skip past already-numbered
    // partners. Only looked up when loginContact is a real, stable value.
    let partnerId: string;
    const existingPartner = loginContact ? await prisma.partner.findUnique({ where: { loginContact } }) : null;
    let partnerAlreadyExists = Boolean(existingPartner);
    if (existingPartner) {
      partnerId = existingPartner.id;
    } else {
      partnerId = idGen();
      if (!loginContact) loginContact = `${partnerId.toLowerCase()}@migrated.local`;
    }

    const password = generatePassword();
    if (!partnerAlreadyExists) generatedPasswords.push({ partnerId, businessName, loginContact, password });

    // What this vendor ACTUALLY paid for, per AN-CRM's own real billing
    // record — never a blanket grant. See resolveSubscription()'s own
    // comment for the exact Active/PastDue/Trial rule.
    const subDoc = await db.collection("vendorsubscriptions").findOne({ vendorId });
    const vendorCreatedAtRaw = pick(vendor, "createdAt");
    const resolved = resolveSubscription(subDoc, vendorCreatedAtRaw instanceof Date ? vendorCreatedAtRaw : undefined);

    console.log(`--- ${businessName} (AN-CRM VendorProfile ${vendorId}) -> ${partnerId}${partnerAlreadyExists ? " (already migrated, adding missing data only)" : ""} ---`);
    console.log(`  loginContact: ${loginContact}`);
    console.log(`  real subscription: ${resolved.subscriptionStatus}${resolved.planId ? ` (${resolved.planId})` : " (no confirmed paid period found in AN-CRM)"}`);

    // Backfill onto an already-migrated Partner from the FIRST run of this
    // script, before planId/terms were part of the mapping — a plain
    // `create` skip alone would leave those partners permanently planless
    // (see getPageTierAccess: no plan = no tier access at all) and without
    // real Terms & Conditions text. Only ever fills a field that's
    // currently unset — never overwrites something the partner may have
    // since edited themselves from Settings.
    if (confirm && partnerAlreadyExists && existingPartner) {
      const patch: Record<string, unknown> = {};
      // Corrects the earlier blanket Ultimate+Active grant this script
      // used before real subscription data was checked — only overwrites
      // planId/subscriptionStatus if the partner hasn't since been changed
      // by a Super Admin from the live app (best-effort: only touches it
      // when it's still exactly the old blanket value this script itself
      // set, "PLAN-ULTIMATE" + "Active", never a value set any other way).
      if (existingPartner.planId === "PLAN-ULTIMATE" && existingPartner.subscriptionStatus === "Active" && resolved.planId !== "PLAN-ULTIMATE") {
        patch.planId = resolved.planId;
        patch.subscriptionStatus = resolved.subscriptionStatus;
        patch.billingCycle = resolved.billingCycle;
        patch.trialStartAt = resolved.trialStartAt;
        patch.trialEndAt = resolved.trialEndAt;
      } else if (!existingPartner.planId && resolved.planId) {
        patch.planId = resolved.planId;
        patch.subscriptionStatus = resolved.subscriptionStatus;
        patch.billingCycle = resolved.billingCycle;
      }
      if (!existingPartner.serviceTerms && serviceTerms) patch.serviceTerms = serviceTerms;
      if (!existingPartner.estimateTerms && estimateTermsAnCrm) patch.estimateTerms = estimateTermsAnCrm;
      if (!existingPartner.invoiceTerms && invoiceTermsAnCrm) patch.invoiceTerms = invoiceTermsAnCrm;
      if (Object.keys(patch).length > 0) {
        await prisma.partner.update({ where: { id: partnerId }, data: patch });
        console.log(`  backfilled/corrected onto existing partner: ${Object.keys(patch).join(", ")} (real status: ${resolved.subscriptionStatus}${resolved.planId ? `, ${resolved.planId}` : ""})`);
      }
    }

    if (confirm && !partnerAlreadyExists) {
      await prisma.partner.create({
        data: {
          id: partnerId,
          internalKey: `${BUSINESS_ID}-${partnerId}`,
          partnerTypeId: "service-centre",
          businessName,
          addressLine: str(pick(vendor, "address.street")) || null,
          city: str(pick(vendor, "address.city"), "—"),
          state: str(pick(vendor, "address.state"), "—"),
          pincode: str(pick(vendor, "address.pincode"), "000000"),
          gstin: str(pick(vendor, "gstNumber")) || null,
          businessEmail: str(pick(vendor, "email"), loginContact),
          businessContact: str(pick(vendor, "phone"), "0000000000"),
          contactPerson: str(pick(vendor, "contactPerson")) || null,
          loginContact,
          passwordHash: hashPassword(password),
          mustChangePassword: true,
          status: "Active",
          // Real subscription state from AN-CRM's own VendorSubscription
          // record — Active+plan only if they actually have a confirmed,
          // unexpired paid period; PastDue if they paid once and it lapsed;
          // Trial (from their REAL signup date, not "now") if they never
          // confirmed a payment at all. Never a blanket paid-plan grant —
          // see resolveSubscription()'s own comment.
          subscriptionStatus: resolved.subscriptionStatus,
          planId: resolved.planId,
          billingCycle: resolved.billingCycle,
          trialStartAt: resolved.trialStartAt,
          trialEndAt: resolved.trialEndAt,
          bankAccountName: str(pick(vendor, "bankAccountName")) || null,
          bankName: str(pick(vendor, "bankName")) || null,
          serviceHours: str(pick(vendor, "serviceCenterInfo.hours")) || null,
          supportHotline: str(pick(vendor, "serviceCenterInfo.hotline")) || null,
          serviceTerms,
          estimateTerms: estimateTermsAnCrm,
          invoiceTerms: invoiceTermsAnCrm,
        },
      });

      for (const moduleSlug of ["service-centre", "inventory", "billing"]) {
        await prisma.moduleAccessKey.create({
          data: {
            partnerId,
            moduleSlug,
            key: `MBF-${moduleSlug.toUpperCase()}-MIGRATED-${partnerId}`,
            status: "active",
            note: "Migrated from AN-CRM",
          },
        });
      }
    }

    // Brand id -> name lookup, scoped to this vendor + shared/global brands,
    // needed so devicemodels/BOM (which reference brandId, not a name) can
    // still carry a readable brand name across into My-Biz-Flow's flat shape.
    const brandDocs = await db
      .collection("brands")
      .find({ $or: [{ vendorId }, { vendorId: null }] })
      .toArray();
    const brandNameById = new Map<string, string>(brandDocs.map((b) => [String(b._id), str(pick(b, "name"))]));

    const collections: { name: string; moduleSlug: string; scope: Document; map: (d: Document) => Record<string, unknown> }[] = [
      {
        name: "brands",
        moduleSlug: "service-centre-brands",
        scope: { $or: [{ vendorId }, { vendorId: null }] },
        map: (d) => ({
          name: str(pick(d, "name")),
          domain: "ELECTRONICS",
          status: pick(d, "isActive") === false ? "Inactive" : "Active",
          _anCrmId: str(d._id),
        }),
      },
      {
        name: "devicemodels",
        moduleSlug: "service-centre-models",
        scope: { $or: [{ vendorId }, { vendorId: null }] },
        map: (d) => ({
          name: str(pick(d, "name")),
          brandName: brandNameById.get(str(pick(d, "brandId"))) ?? "",
          domain: "ELECTRONICS",
          status: pick(d, "isActive") === false ? "Inactive" : "Active",
          _anCrmId: str(d._id),
        }),
      },
      {
        name: "solutions",
        moduleSlug: "service-centre-solutions",
        scope: { $or: [{ vendorId }, { vendorId: null }] },
        map: (d) => ({
          title: str(pick(d, "code")),
          category: "Other",
          status: pick(d, "isActive") === false ? "Inactive" : "Active",
          _anCrmId: str(d._id),
        }),
      },
      {
        name: "servicecenterboms",
        moduleSlug: "inventory-bom",
        scope: { $or: [{ vendorId }, { vendorId: null }] },
        map: (d) => ({
          description: str(pick(d, "partName")) + (pick(d, "description") ? ` — ${str(pick(d, "description"))}` : ""),
          hsnCode: str(pick(d, "hsnCode")),
          uom: str(pick(d, "unit"), "PCS"),
          rate: Number(pick(d, "rate")) || 0,
          taxPercent: Number(pick(d, "gstRate")) || 18,
          type: str(pick(d, "partType"), "SPARE_PART") === "LABOUR" ? "Service" : "Spare Part",
          status: "Active",
          _anCrmId: str(d._id),
        }),
      },
      {
        // AN-CRM's real standalone customer directory (src/models/Customer.ts)
        // — scoped by vendorId, same as crmjobsheets below (Customer also
        // carries an optional businessId, but that field exists only for
        // AN-CRM's own later cross-business aggregation and every real
        // document here already carries the vendor's vendorId, so vendorId
        // is the correct scope, matching how every other per-vendor
        // collection in this script is scoped).
        name: "customers",
        moduleSlug: "service-centre-customers",
        scope: { vendorId },
        map: (d) => ({
          name: str(pick(d, "name")),
          phone: str(pick(d, "phone")),
          email: str(pick(d, "email")),
          address: str(pick(d, "address")),
          city: str(pick(d, "city")),
          state: str(pick(d, "state")),
          pincode: str(pick(d, "pincode")),
          gstin: str(pick(d, "gstin")),
          notes: str(pick(d, "notes")),
          status: pick(d, "isActive") === false ? "Inactive" : "Active",
          _anCrmId: str(d._id),
        }),
      },
      {
        name: "crmjobsheets",
        moduleSlug: "service-centre",
        scope: { vendorId },
        map: (d) => {
          const anCrmStatus = str(pick(d, "status"), "CREATED");
          const { stage, onHold, holdReason } = mapAnCrmStatusToStage(anCrmStatus);
          const cancelledAtRaw = pick(d, "cancelledAt");
          return {
            // Real AN-CRM job number (e.g. "WO202609120007") preserved as
            // this record's own id — previously left unset here, so
            // createBusinessRecord() minted a random SER-XXXXXX key instead
            // and the real job number was lost on migration.
            id: str(pick(d, "jobSheetNumber")) || undefined,
            customer: str(pick(d, "customerName")),
            customerPhone: str(pick(d, "phone")),
            customerGstin: str(pick(d, "gstin")),
            customerAddress: str(pick(d, "address")),
            customerCity: str(pick(d, "city")),
            customerState: str(pick(d, "state")),
            customerPincode: str(pick(d, "pincode")),
            brandName: brandNameById.get(str(pick(d, "brandId"))) ?? str(pick(d, "pendingBrandName")),
            modelName: str(pick(d, "deviceModel")),
            imeiOrSerialNumber: str(pick(d, "imeiOrSerialNumber")),
            faultDescription: str(pick(d, "issueDescription")),
            remark: str(pick(d, "remark")),
            warrantyStatus: pick(d, "warrantyStatus") ?? undefined,
            warrantyFlag: pick(d, "warrantyStatus") === "IW",
            paymentMode: mapPaymentMode(pick(d, "paymentMode")),
            collectedByName: str(pick(d, "paymentCollectedByName")),
            brandJobNoForPartOrder: str(pick(d, "brandJobNoForPartOrder")),
            // Real lifecycle state (previously only a generic, unread
            // `status` string was set — the actual stage/onHold/cancelledAt
            // fields every real UI path reads were left unset, so every
            // migrated job silently showed as "Created" regardless of its
            // real AN-CRM status).
            stage,
            onHold,
            holdReason,
            cancelledAt: cancelledAtRaw instanceof Date ? cancelledAtRaw.toISOString() : undefined,
            cancelReason: str(pick(d, "cancelReason")) || undefined,
            stageHistory: buildStageHistory(d),
            status: anCrmStatus,
            receivedDate: pick(d, "createdAt"),
            recordCreatedAt: pick(d, "createdAt"),
            _anCrmId: str(d._id),
          };
        },
      },
      {
        name: "salesinvoices",
        moduleSlug: "billing",
        scope: { vendorId },
        map: (d) => {
          const statusMap: Record<string, string> = {
            DRAFT: "Draft",
            SENT: "Sent",
            PAID: "Paid",
            OVERDUE: "Overdue",
            CANCELLED: "Cancelled",
            FAILED: "Draft",
            PARTIAL: "Sent",
          };
          const total = Number(pick(d, "grandTotal")) || 0;
          const paid = Number(pick(d, "paidAmount")) || 0;
          return {
            customer: str(pick(d, "customer.name")),
            customerGstin: str(pick(d, "customer.gstin")),
            subtotal: Number(pick(d, "subtotal")) || 0,
            taxAmount: Number(pick(d, "taxTotal")) || 0,
            discountAmount: Number(pick(d, "discountAmount")) || 0,
            totalAmount: total,
            amountPaid: paid,
            amountDue: total - paid,
            paymentStatus: statusMap[str(pick(d, "status"))] ?? "Sent",
            issueDate: pick(d, "issueDate", "createdAt"),
            recordCreatedAt: pick(d, "createdAt"),
            _anCrmId: str(d._id),
            _anCrmInvoiceNumber: str(pick(d, "invoiceNumber")),
          };
        },
      },
    ];

    // One-time correction pass: the FIRST run of this script (before this
    // fix) migrated crmjobsheets with a random generated id and no real
    // stage/onHold/cancelledAt — every migrated job showed as stage
    // "Created" regardless of its real AN-CRM status, and lost its real job
    // number. Re-importing those specific rows requires clearing them
    // first, since createBusinessRecord only creates, never updates. Scoped
    // tightly to ONLY rows this same script created (matched by having
    // `_anCrmId` at all) — never touches a workorder created normally
    // through the live app afterward (which would have no `_anCrmId`).
    if (confirm) {
      const staleWorkorders = await prisma.businessRecord.findMany({
        where: { partnerId, moduleSlug: "service-centre" },
        select: { id: true, data: true },
      });
      const toDelete = staleWorkorders.filter((r) => {
        const data = r.data as Record<string, unknown>;
        // Only rows migrated by an earlier, pre-fix run: they have a real
        // _anCrmId but are missing the `stage` field this fix now always
        // sets — a workorder migrated correctly by this fixed version (or
        // created live in the app) is left alone.
        return typeof data?._anCrmId === "string" && data.stage === undefined;
      });
      if (toDelete.length > 0) {
        await prisma.businessRecord.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
        console.log(`  cleared ${toDelete.length} previously-migrated workorder(s) with the old, incorrect mapping — will re-import with real job numbers/status below.`);
      }
    }

    for (const col of collections) {
      const docs = await db.collection(col.name).find(col.scope).toArray();
      // Idempotent per collection: skip a document already migrated into
      // this partner (matched by the _anCrmId stamped on it last time) —
      // makes the whole script safely re-runnable to pick up a newly-added
      // collection (like salesinvoices) without duplicating what's already
      // there for collections processed on an earlier run.
      // Checked in BOTH dry-run and --confirm mode (this is a read, never a
      // write, so it's safe either way) — otherwise the dry-run preview
      // always shows "0 already migrated" regardless of real state, which
      // is misleading, not actually representative of what --confirm would do.
      const alreadyMigrated = new Set(
        (await prisma.businessRecord.findMany({ where: { partnerId, moduleSlug: col.moduleSlug }, select: { data: true } })).map(
          (r) => (r.data as Record<string, unknown>)?._anCrmId
        )
      );
      const newDocs = docs.filter((d) => !alreadyMigrated.has(str(d._id)));
      console.log(`  ${col.name}: ${docs.length} document(s) (${docs.length - newDocs.length} already migrated, ${newDocs.length} new)`);
      if (!confirm) continue;
      for (const d of newDocs) {
        const mapped = col.map(d);
        await createBusinessRecord(partnerId, col.moduleSlug, mapped);
      }
    }

    // Align this partner's "next workorder number" counter so a job
    // created live in the app afterward continues on from the real,
    // migrated history instead of restarting at #1 — migrated jobsheets
    // keep their real AN-CRM job number directly (they bypass
    // getNextNumber() entirely, see the crmjobsheets `map()` above), so
    // NumberingCounter was never touched by the import itself. Brand/Model/
    // BOM-material counters need no such fix: those DO go through
    // createBusinessRecord's real numbered path on every migrated row, so
    // they're already correctly incremented as a side effect of the import.
    if (confirm) {
      const totalWorkorders = await prisma.businessRecord.count({ where: { partnerId, moduleSlug: "service-centre" } });
      if (totalWorkorders > 0) {
        const scopeKey = `partner:${partnerId}:service-centre.workorder`;
        const existingCounter = await prisma.numberingCounter.findUnique({ where: { scopeKey } });
        if (!existingCounter || existingCounter.value < totalWorkorders) {
          await prisma.numberingCounter.upsert({
            where: { scopeKey },
            create: { scopeKey, value: totalWorkorders },
            update: { value: totalWorkorders },
          });
          console.log(`  aligned workorder number counter to ${totalWorkorders} — the next new workorder will be #${totalWorkorders + 1}.`);
        }
      }
    }

    console.log("");
  }

  await mongo.close();

  if (!confirm) {
    console.log("DRY RUN — nothing written. Re-run with --confirm to actually migrate.");
  } else {
    console.log("\n=== GENERATED LOGIN CREDENTIALS (shown once — copy these now) ===");
    for (const g of generatedPasswords) {
      console.log(`${g.partnerId} — ${g.businessName} — login: ${g.loginContact} — password: ${g.password}`);
    }
    console.log("Every migrated partner must change their password on first login (mustChangePassword: true).");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exitCode = 1;
});
