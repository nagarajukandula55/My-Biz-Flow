/**
 * Per-module access keys — the actual per-partner secret/gate for an
 * entire module, backed by the `ModuleAccessKey` Prisma table. Distinct
 * from PartnerType.defaultModules (which only toggles a module's
 * visibility at the plan level): a partner can be on a plan that includes
 * a module and still have no active key for it, in which case
 * assertModuleAccess() (src/lib/tenant.ts) blocks that module's
 * data-access functions. Issued/revoked by Super Admin from
 * /admin/access-keys.
 */

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

/**
 * "requested" is a partner-initiated pending state: the partner asked for a
 * module from Settings (requestAccessKey below) but no Super Admin has
 * approved it yet — assertModuleAccess/getPartnerEntitlements both treat it
 * exactly like "no key", so nothing becomes reachable just by requesting.
 * Approving one is just issueAccessKey() as usual (flips it to "active").
 */
export type AccessKeyStatus = "active" | "revoked" | "requested";

export type ModuleAccessKeyRecord = {
  id: string;
  partnerId: string;
  moduleSlug: string;
  key: string;
  status: string;
  issuedAt: Date;
  revokedAt: Date | null;
  note: string | null;
};

function generateKey(moduleSlug: string): string {
  const suffix = randomBytes(6).toString("hex").toUpperCase();
  return `MBF-${moduleSlug.toUpperCase()}-${suffix}`;
}

export async function getAccessKey(
  partnerId: string,
  moduleSlug: string
): Promise<ModuleAccessKeyRecord | null> {
  return prisma.moduleAccessKey.findUnique({
    where: { partnerId_moduleSlug: { partnerId, moduleSlug } },
  });
}

export async function listAccessKeysForPartner(partnerId: string): Promise<ModuleAccessKeyRecord[]> {
  return prisma.moduleAccessKey.findMany({ where: { partnerId }, orderBy: { moduleSlug: "asc" } });
}

export async function listAllAccessKeys(): Promise<ModuleAccessKeyRecord[]> {
  return prisma.moduleAccessKey.findMany({ orderBy: [{ partnerId: "asc" }, { moduleSlug: "asc" }] });
}

export async function hasActiveAccessKey(partnerId: string, moduleSlug: string): Promise<boolean> {
  const record = await getAccessKey(partnerId, moduleSlug);
  return record?.status === "active";
}

/**
 * Issues (or re-issues, if a revoked one already exists) an active key for
 * this partner/module pair.
 */
export async function issueAccessKey(
  partnerId: string,
  moduleSlug: string,
  note?: string
): Promise<ModuleAccessKeyRecord> {
  const key = generateKey(moduleSlug);
  return prisma.moduleAccessKey.upsert({
    where: { partnerId_moduleSlug: { partnerId, moduleSlug } },
    create: { partnerId, moduleSlug, key, status: "active", note },
    update: { key, status: "active", revokedAt: null, note },
  });
}

export async function revokeAccessKey(partnerId: string, moduleSlug: string): Promise<void> {
  await prisma.moduleAccessKey.update({
    where: { partnerId_moduleSlug: { partnerId, moduleSlug } },
    data: { status: "revoked", revokedAt: new Date() },
  });
}

/**
 * Partner self-service entry point — replaces the old "toggle it on
 * yourself" demo stub on /partner/<id>/settings. Records a pending request
 * for Super Admin review (visible on /admin/access-keys) instead of
 * granting anything: the row's `key` is a placeholder (never a real,
 * usable secret) until a Super Admin actually approves it via
 * issueAccessKey, which overwrites both the key and the status. A no-op if
 * this partner already holds an active key, or already has a pending
 * request, for this module.
 */
export async function requestAccessKey(
  partnerId: string,
  moduleSlug: string,
  note?: string
): Promise<ModuleAccessKeyRecord> {
  const existing = await getAccessKey(partnerId, moduleSlug);
  if (existing?.status === "active" || existing?.status === "requested") return existing;
  const placeholderKey = `PENDING-${moduleSlug.toUpperCase()}-${randomBytes(6).toString("hex").toUpperCase()}`;
  return prisma.moduleAccessKey.upsert({
    where: { partnerId_moduleSlug: { partnerId, moduleSlug } },
    create: { partnerId, moduleSlug, key: placeholderKey, status: "requested", note },
    update: { key: placeholderKey, status: "requested", revokedAt: null, note },
  });
}

/**
 * The full set of module slugs this partner currently holds an ACTIVE
 * access key for — what dashboard/settings/analytics/profile (the
 * "platform" pages) render against, so each partner only sees the
 * data/options their own entitlements actually cover.
 */
export async function getPartnerEntitlements(partnerId: string): Promise<string[]> {
  const keys = await listAccessKeysForPartner(partnerId);
  return keys.filter((k) => k.status === "active").map((k) => k.moduleSlug);
}
