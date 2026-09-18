/**
 * Real Partner accounts — Prisma-backed (`Partner` table). Public id is
 * "<prefix>####" (login id, shown on invoices, all partner-facing surfaces),
 * where <prefix> comes from the Partner's own PartnerType.idPrefix (defaults
 * to "VND" for every type that doesn't set one; the Service Centre type
 * uses "SC"). Each distinct prefix has its own independent sequence — see
 * nextPartnerId() below. internalKey ("BIZ002-<id>") is for our own DB
 * relations and the eventual central-api sync only — never shown to the
 * partner. businessId fixed to "BIZ002" until real cross-business support
 * exists.
 */
import { safeCache as cache } from "@/lib/safeCache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword, generatePassword } from "@/lib/passwords";
import { createBusinessRecord } from "@/lib/businessRecords";
import { getPartnerType } from "@/lib/designer/partnerTypesData";
import { issueAccessKey } from "@/lib/designer/accessKeys";
import { parseProductDomains, type ProductDomain } from "@/lib/catalog/productDomains";
import { parseServiceTypes, parsePincodeList } from "@/lib/serviceTypes";

const BUSINESS_ID = "BIZ002";

export type PartnerRecord = {
  id: string;
  internalKey: string;
  businessId: string;
  partnerTypeId: string;
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  timezone: string;
  currency: string;
  logoDataUrl: string | null;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  mustChangePassword: boolean;
  status: string;
  subscriptionStatus: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  billingCycle: string | null;
  planId: string | null;
  offerId: string | null;
  createdAt: Date;
  contactPerson: string | null;
  pan: string | null;
  businessCategory: string | null;
  /**
   * Always normalised (never raw JSON, never empty) — see
   * parseProductDomains(). A partner who has never chosen reads as
   * ["ELECTRONICS"].
   */
  productDomains: ProductDomain[];
  /** Which Service Centre service types (ONSITE/WALK_IN) this partner offers — see src/lib/serviceTypes.ts. */
  serviceCentreServiceTypes: string[];
  /** 6-digit pincodes this partner covers for Service Centre inquiries/appointments. */
  serviceCentrePincodes: string[];
  serviceTerms: string | null;
  serviceHours: string | null;
  supportHotline: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  /** Per-document-type T&C overrides; each falls back to serviceTerms when blank. */
  workorderTerms: string | null;
  estimateTerms: string | null;
  invoiceTerms: string | null;
  serviceRecordTerms: string | null;
  /** Whole rupees (this app stores money in rupees, not paise). */
  defaultLaborCharge: number | null;
  upiId: string | null;
  /** Settings' "Serialized Inventory" toggle — see schema.prisma's comment on the column for what it gates. */
  serializedInventoryEnabled: boolean;
};

function toRecord(row: {
  id: string;
  internalKey: string;
  businessId: string;
  partnerTypeId: string;
  businessName: string;
  addressLine: string | null;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  timezone: string;
  currency: string;
  logoDataUrl: string | null;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  mustChangePassword: boolean;
  status: string;
  subscriptionStatus: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  billingCycle: string | null;
  planId: string | null;
  offerId: string | null;
  createdAt: Date;
  contactPerson: string | null;
  pan: string | null;
  businessCategory: string | null;
  productDomains: unknown;
  serviceCentreServiceTypes: unknown;
  serviceCentrePincodes: unknown;
  serviceTerms: string | null;
  serviceHours: string | null;
  supportHotline: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  /** Per-document-type T&C overrides; each falls back to serviceTerms when blank. */
  workorderTerms: string | null;
  estimateTerms: string | null;
  invoiceTerms: string | null;
  serviceRecordTerms: string | null;
  /** Whole rupees (this app stores money in rupees, not paise). */
  defaultLaborCharge: number | null;
  upiId: string | null;
  serializedInventoryEnabled: boolean;
}): PartnerRecord {
  return {
    ...row,
    addressLine: row.addressLine ?? "",
    productDomains: parseProductDomains(row.productDomains),
    serviceCentreServiceTypes: parseServiceTypes(row.serviceCentreServiceTypes),
    serviceCentrePincodes: parsePincodeList(row.serviceCentrePincodes),
  };
}

export type PartnerBusinessProfileInput = {
  contactPerson: string;
  pan: string;
  businessCategory: string;
  /** Raw checkbox values from the Settings form; normalised before storing. */
  productDomains: string[];
  serviceHours: string;
  supportHotline: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
};

/**
 * The Config-tab fields: operational defaults and the Terms & Conditions
 * text that prints on each document. Separate from
 * PartnerBusinessProfileInput because they are a separate form (and a
 * separate Server Action) on the Settings page — saving one must not blank
 * the other's columns.
 */
export type PartnerConfigInput = {
  /** Raw form string in whole rupees; blank/0/non-numeric stores null. */
  defaultLaborCharge: string;
  upiId: string;
  /** The general fallback — stored in the existing serviceTerms column. */
  serviceTerms: string;
  workorderTerms: string;
  estimateTerms: string;
  invoiceTerms: string;
  serviceRecordTerms: string;
};

export type PartnerBusinessDetailsInput = {
  businessName: string;
  address: string;
  gstin: string;
  timezone: string;
  currency: string;
};

/**
 * Persists Settings' top "Business Details" block — businessName/gstin were
 * already real Partner columns (used elsewhere, e.g. printed documents) but
 * this form used to be a non-persisting demo stub that never read or wrote
 * them; timezone/currency are new columns added for this same block. Kept
 * as its own action/column-set, separate from updatePartnerBusinessProfile
 * (Contact Person/PAN/etc.) and updatePartnerConfig, so saving one form
 * never blanks another's fields. `address` maps to the existing addressLine
 * column only — city/state/pincode stay as set at signup, there is no
 * second place in this app that edits those today.
 */
export async function updatePartnerBusinessDetails(
  partnerId: string,
  input: PartnerBusinessDetailsInput
): Promise<void> {
  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      businessName: input.businessName.trim() || undefined,
      addressLine: input.address.trim(),
      gstin: input.gstin.trim() || null,
      timezone: input.timezone.trim() || "Asia/Kolkata",
      currency: input.currency.trim() || "INR",
    },
  });
}

/**
 * Persists Settings' Logo upload. Stored as a `data:` URL directly on the
 * Partner row — there is no S3/file-storage pipeline anywhere in this app,
 * so this is the minimal real option rather than inventing one. Capped at
 * ~1.5MB of base64 (roughly a 1MB source image) so a partner can't bloat
 * the row indefinitely; callers should downsize/compress client-side before
 * calling this, but this is the hard backstop.
 */
const MAX_LOGO_DATA_URL_LENGTH = 1_500_000;

export async function updatePartnerLogo(partnerId: string, dataUrl: string | null): Promise<void> {
  if (dataUrl && dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    throw new Error("Logo image is too large — please use a smaller file (under ~1MB).");
  }
  if (dataUrl && !/^data:image\/(png|jpe?g|webp|svg\+xml|gif);base64,/.test(dataUrl)) {
    throw new Error("Unsupported image format.");
  }
  await prisma.partner.update({
    where: { id: partnerId },
    data: { logoDataUrl: dataUrl },
  });
}

/**
 * Persists the business-profile/bank-detail fields a partner fills in from
 * /partner/<id>/settings after signup (signup itself only collects the
 * bare minimum). All nullable on the model — an empty string here is
 * stored as null, not "". Nothing reads these to move money; the bank
 * fields are display/record-keeping only, same as AN-CRM's own vendor
 * profile page.
 */
export async function updatePartnerBusinessProfile(
  partnerId: string,
  input: PartnerBusinessProfileInput
): Promise<void> {
  const clean = (v: string) => v.trim() || null;
  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      contactPerson: clean(input.contactPerson),
      pan: clean(input.pan),
      businessCategory: clean(input.businessCategory),
      // Normalised (unknown codes dropped, empty falls back to
      // ELECTRONICS) so nothing downstream has to defend against a
      // hand-posted value.
      productDomains: parseProductDomains(input.productDomains),
      serviceHours: clean(input.serviceHours),
      supportHotline: clean(input.supportHotline),
      bankAccountName: clean(input.bankAccountName),
      bankName: clean(input.bankName),
      bankAccountNumber: clean(input.bankAccountNumber),
      bankIfsc: clean(input.bankIfsc),
    },
  });
}

/**
 * Persists the Settings > Config section. Money is stored in whole rupees
 * (this app's convention throughout — Plan.price and a service line's
 * laborCharge are both plain rupee amounts, not paise), so the form value
 * is stored as-is once validated. A blank, zero, negative or non-numeric
 * labour charge stores null — "no default" — rather than a 0 that would
 * pre-fill every new service line with a figure that reads as a real quote.
 */
export async function updatePartnerConfig(partnerId: string, input: PartnerConfigInput): Promise<void> {
  const clean = (v: string) => v.trim() || null;
  const parsedLabor = Math.round(Number(input.defaultLaborCharge.trim()));
  const defaultLaborCharge =
    input.defaultLaborCharge.trim() === "" || !Number.isFinite(parsedLabor) || parsedLabor <= 0
      ? null
      : parsedLabor;

  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      defaultLaborCharge,
      upiId: clean(input.upiId),
      serviceTerms: clean(input.serviceTerms),
      workorderTerms: clean(input.workorderTerms),
      estimateTerms: clean(input.estimateTerms),
      invoiceTerms: clean(input.invoiceTerms),
      serviceRecordTerms: clean(input.serviceRecordTerms),
    },
  });
}

/**
 * Persists the Settings > Service Centre tab's "Service area" block: which
 * service types this partner offers and which pincodes they cover. Backs
 * the public Book Appointment form's auto-assignment (see
 * src/lib/serviceCentreInquiryAssignment.ts) — a partner with no service
 * types or pincodes configured is simply excluded from matching until they
 * set at least one.
 */
export async function updatePartnerServiceArea(
  partnerId: string,
  input: { serviceTypes: string[]; pincodes: string[] }
): Promise<void> {
  await prisma.partner.update({
    where: { id: partnerId },
    data: {
      serviceCentreServiceTypes: parseServiceTypes(input.serviceTypes),
      serviceCentrePincodes: parsePincodeList(input.pincodes),
    },
  });
}

/**
 * Settings' "Serialized Inventory" toggle — was a client-only demo stub;
 * this is its real persistence. See Partner.serializedInventoryEnabled's
 * schema comment and deductInventoryForWorkorderAction (service-centre
 * [recordId]/actions.ts) for what turning this on/off actually gates.
 */
export async function updatePartnerSerializedInventoryEnabled(partnerId: string, enabled: boolean): Promise<void> {
  await prisma.partner.update({
    where: { id: partnerId },
    data: { serializedInventoryEnabled: enabled },
  });
}

/** The four printable Service Centre documents that can carry their own terms. */
export type PartnerDocumentTermsKind = "workorder" | "estimate" | "invoice" | "serviceRecord";

/**
 * Resolves which Terms & Conditions text a given document should print:
 * that document type's own override, else the partner's general terms,
 * else nothing at all. Returning null (rather than "") is deliberate —
 * callers render the terms block only when this is non-null, so a partner
 * who has configured no terms gets no empty boilerplate heading.
 */
export function resolveDocumentTerms(
  partner: Pick<
    PartnerRecord,
    "serviceTerms" | "workorderTerms" | "estimateTerms" | "invoiceTerms" | "serviceRecordTerms"
  > | null | undefined,
  kind: PartnerDocumentTermsKind
): string | null {
  if (!partner) return null;
  const specific = {
    workorder: partner.workorderTerms,
    estimate: partner.estimateTerms,
    invoice: partner.invoiceTerms,
    serviceRecord: partner.serviceRecordTerms,
  }[kind];
  return specific?.trim() || partner.serviceTerms?.trim() || null;
}

/**
 * Auto role assignment: the first team member ("Owner") on a freshly
 * created Partner account, given the Role its chosen Partner Type puts
 * first in assignableRoleIds (falling back to "Owner / Admin" if that
 * type has no Roles configured yet). Persisted as a real Users
 * BusinessRecord, same as any team member added later from
 * /partner/[partnerId]/admin/users.
 */
async function assignOwnerRole(partner: PartnerRecord): Promise<void> {
  const partnerType = await getPartnerType(partner.partnerTypeId);
  const roleId = partnerType?.assignableRoleIds[0] ?? "Owner / Admin";
  await createBusinessRecord(partner.id, "users", {
    id: "Owner",
    email: partner.businessEmail,
    role: roleId,
    status: "Active",
    lastLogin: "",
  });
}

/**
 * Issues an active ModuleAccessKey for every module in the partner's
 * PartnerType.defaultModules, so a self-signed-up partner can actually use
 * what they signed up for immediately — without this, getVisibleModules()
 * (src/lib/designer/entitlements.ts, what the sidebar/dashboard/analytics
 * all render against) requires BOTH "nominally enabled" AND an active key,
 * and nothing issues a key at signup time otherwise (the access-key system
 * was built for a Super-Admin-assisted onboarding flow, not self-signup).
 */
async function issueDefaultModuleAccessKeys(partner: PartnerRecord): Promise<void> {
  const partnerType = await getPartnerType(partner.partnerTypeId);
  const modules = partnerType?.defaultModules ?? [];
  await Promise.all(modules.map((slug) => issueAccessKey(partner.id, slug, "Auto-issued at signup")));
}

/**
 * Computes the next sequential "<prefix>####" Partner id for the given
 * partnerTypeId, inside the same transaction as the Partner insert (so two
 * concurrent signups against the same or different prefixes never race).
 * Each prefix (from PartnerType.idPrefix, default "VND") gets its own
 * independent sequence — counted only over existing partners whose id
 * already starts with that same prefix, so e.g. VND and SC sequences never
 * share or skip numbers because of each other.
 */
async function nextPartnerId(tx: Prisma.TransactionClient, partnerTypeId: string): Promise<string> {
  const partnerType = await tx.partnerType.findUnique({ where: { id: partnerTypeId } });
  const prefix = partnerType?.idPrefix || "VND";
  const count = await tx.partner.count({ where: { id: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}

// 15 days for every new signup, uniformly — matches AN-CRM's real, currently
// live free-trial length (see AN-CRM's src/core/pricing/plans.ts,
// freeTrialDays: 15 on every SC plan).
const TRIAL_DAYS = 15;

function trialDates(): { trialStartAt: Date; trialEndAt: Date } {
  const trialStartAt = new Date();
  const trialEndAt = new Date(trialStartAt);
  trialEndAt.setDate(trialEndAt.getDate() + TRIAL_DAYS);
  return { trialStartAt, trialEndAt };
}

export type PartnerSignupInput = {
  partnerTypeId: string;
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  /** Product domain codes ticked on the signup form. */
  productDomains?: string[];
  referredByPartnerId?: string;
};

/**
 * Creates a Partner with the next sequential <prefix>#### id (inside a
 * transaction to avoid two signups racing to the same number) and a
 * freshly generated password — signup never collects a password
 * directly, see /signup. Returns the plaintext password ONCE, for the
 * success page / welcome email to show; it is never stored or
 * retrievable again after this call returns.
 */
export async function createPartner(input: PartnerSignupInput): Promise<{ partner: PartnerRecord; password: string }> {
  const password = generatePassword();
  const passwordHash = hashPassword(password);

  const partner = await prisma.$transaction(async (tx) => {
    const id = await nextPartnerId(tx, input.partnerTypeId);
    const internalKey = `${BUSINESS_ID}-${id}`;
    const row = await tx.partner.create({
      data: {
        id,
        internalKey,
        businessId: BUSINESS_ID,
        partnerTypeId: input.partnerTypeId,
        businessName: input.businessName,
        addressLine: input.addressLine,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        gstin: input.gstin || null,
        businessEmail: input.businessEmail,
        businessContact: input.businessContact,
        loginContact: input.loginContact,
        productDomains: parseProductDomains(input.productDomains),
        referredByPartnerId: input.referredByPartnerId || null,
        passwordHash,
        ...trialDates(),
      },
    });
    return toRecord(row);
  });

  await assignOwnerRole(partner);
  await issueDefaultModuleAccessKeys(partner);
  return { partner, password };
}

/** Creates a Partner from an already-approved PartnerSignupRequest, reusing its already-hashed password. */
export async function createPartnerFromRequest(request: {
  partnerTypeId: string;
  businessName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string | null;
  businessEmail: string;
  businessContact: string;
  loginContact: string;
  passwordHash: string;
  productDomains: unknown;
}): Promise<PartnerRecord> {
  const partner = await prisma.$transaction(async (tx) => {
    const id = await nextPartnerId(tx, request.partnerTypeId);
    const internalKey = `${BUSINESS_ID}-${id}`;
    const row = await tx.partner.create({
      data: {
        id,
        internalKey,
        businessId: BUSINESS_ID,
        partnerTypeId: request.partnerTypeId,
        businessName: request.businessName,
        addressLine: request.addressLine,
        city: request.city,
        state: request.state,
        pincode: request.pincode,
        gstin: request.gstin,
        businessEmail: request.businessEmail,
        businessContact: request.businessContact,
        loginContact: request.loginContact,
        passwordHash: request.passwordHash,
        // Preserved from the application rather than reset — the applicant
        // already told us what they deal in when they applied.
        productDomains: parseProductDomains(request.productDomains),
        ...trialDates(),
      },
    });
    return toRecord(row);
  });

  await assignOwnerRole(partner);
  await issueDefaultModuleAccessKeys(partner);
  return partner;
}

/** Looks a partner up by their public <prefix>#### id OR their registered login contact number — never the internal key. */
export async function findPartnerByLoginIdentifier(identifier: string): Promise<PartnerRecord | undefined> {
  const trimmed = identifier.trim();
  const row = await prisma.partner.findFirst({
    where: { OR: [{ id: trimmed }, { loginContact: trimmed }] },
  });
  return row ? toRecord(row) : undefined;
}

/**
 * Looks a partner up for a password-reset request: by their public
 * <prefix>#### id, their registered login contact number, OR their
 * registered business email — whichever one the person typed into
 * "forgot password". Deliberately broader than findPartnerByLoginIdentifier
 * (which only checks id/loginContact, since that's all the login form
 * asks for) because the forgot-password form asks for "the email on your
 * account", and businessEmail is where the reset link itself gets sent
 * regardless of which field matched.
 */
export async function findPartnerForPasswordReset(identifier: string): Promise<PartnerRecord | undefined> {
  const trimmed = identifier.trim();
  if (!trimmed) return undefined;
  const row = await prisma.partner.findFirst({
    where: { OR: [{ id: trimmed }, { loginContact: trimmed }, { businessEmail: trimmed }] },
  });
  return row ? toRecord(row) : undefined;
}

export async function verifyPartnerPassword(partnerId: string, password: string): Promise<boolean> {
  const row = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!row) return false;
  return verifyPassword(password, row.passwordHash);
}

/** Sets a new password and clears the forced-change flag — used by the post-login "change your password" step. */
export async function setPartnerPassword(partnerId: string, newPassword: string): Promise<void> {
  await prisma.partner.update({
    where: { id: partnerId },
    data: { passwordHash: hashPassword(newPassword), mustChangePassword: false },
  });
}

/**
 * Wrapped in React's cache() so the many partner pages/layouts that each
 * call getPartner(partnerId) independently within one request (e.g. the
 * partner layout plus its child page) share a single Postgres query
 * instead of re-fetching. Dedup is per-request only — no cross-request
 * staleness risk, unlike a time-based cache would introduce.
 */
export const getPartner = cache(async function getPartner(id: string): Promise<PartnerRecord | undefined> {
  const row = await prisma.partner.findUnique({ where: { id } });
  return row ? toRecord(row) : undefined;
});

export async function listPartners(): Promise<PartnerRecord[]> {
  const rows = await prisma.partner.findMany({ orderBy: { id: "asc" } });
  return rows.map(toRecord);
}

export async function deleteAllPartners(): Promise<number> {
  const { count } = await prisma.partner.deleteMany({});
  return count;
}

export type SubscriptionUpdateInput = {
  subscriptionStatus: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  billingCycle: string | null;
  planId: string | null;
  offerId: string | null;
};

/** Super Admin override of a partner's subscription — status, trial window, plan, cycle, offer. */
export async function updatePartnerSubscription(id: string, data: SubscriptionUpdateInput): Promise<void> {
  await prisma.partner.update({ where: { id }, data });
}
