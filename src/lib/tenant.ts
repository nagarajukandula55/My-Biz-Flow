/**
 * Tenant-scoping convention (binding — see DESIGN_SYSTEM.md §9).
 *
 * Every route under /partner/[partnerId]/... carries a partnerId, but nothing
 * currently ENFORCES that the data shown actually belongs to that partner —
 * there's no database yet, everything renders from static sample data, so
 * the gap is invisible today. It stops being invisible the moment a real
 * data-access layer lands, and retrofitting tenant scoping across code
 * that was written without the habit is exactly the kind of thing that
 * causes cross-tenant data leaks in production.
 *
 * The rule going forward: every future function that reads or writes
 * record data MUST take a partnerId and filter/check by it — call
 * assertPartnerScope() (or the equivalent once Prisma is wired up, e.g. a
 * `where: { partnerId }` clause) before returning anything. Never write a
 * data-access function that trusts the caller to have already filtered.
 */

export class PartnerScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerScopeError";
  }
}

/**
 * Call this at the top of any (future) data-access function once real
 * records exist. Throws if the record's own partnerId doesn't match the
 * partnerId the request is scoped to — fail closed, not open.
 *
 * Today there is no `record.partnerId` to check (sample data has none), so
 * this is a guard clause with nothing to guard yet — it exists so the
 * calling convention is established now, not invented under pressure later
 * when the first real query is written.
 */
export function assertPartnerScope(requestPartnerId: string, recordPartnerId: string): void {
  if (requestPartnerId !== recordPartnerId) {
    throw new PartnerScopeError(
      `Partner scope violation: request scoped to partner "${requestPartnerId}" but record belongs to partner "${recordPartnerId}".`
    );
  }
}

export class ModuleAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModuleAccessError";
  }
}

/**
 * Call this next to assertPartnerScope() in any (future) data-access
 * function that belongs to a specific module. A module being in the
 * partner's PartnerType.defaultModules only means it's toggled on for
 * their plan — this checks the actual per-partner secret
 * (ModuleAccessKey, see src/lib/designer/accessKeys.ts) that gates
 * whether the module is truly reachable. Fail closed: no active key, no
 * data.
 */
export async function assertModuleAccess(partnerId: string, moduleSlug: string): Promise<void> {
  const { hasActiveAccessKey } = await import("@/lib/designer/accessKeys");
  const allowed = await hasActiveAccessKey(partnerId, moduleSlug);
  if (!allowed) {
    throw new ModuleAccessError(
      `Module access denied: partner "${partnerId}" has no active access key for module "${moduleSlug}".`
    );
  }
}
