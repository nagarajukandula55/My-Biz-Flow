/**
 * Tenant-scoping convention (binding — see DESIGN_SYSTEM.md §9).
 *
 * Every route under /vendor/[vendorId]/... carries a vendorId, but nothing
 * currently ENFORCES that the data shown actually belongs to that vendor —
 * there's no database yet, everything renders from static sample data, so
 * the gap is invisible today. It stops being invisible the moment a real
 * data-access layer lands, and retrofitting tenant scoping across code
 * that was written without the habit is exactly the kind of thing that
 * causes cross-tenant data leaks in production.
 *
 * The rule going forward: every future function that reads or writes
 * record data MUST take a vendorId and filter/check by it — call
 * assertVendorScope() (or the equivalent once Prisma is wired up, e.g. a
 * `where: { vendorId }` clause) before returning anything. Never write a
 * data-access function that trusts the caller to have already filtered.
 */

export class VendorScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VendorScopeError";
  }
}

/**
 * Call this at the top of any (future) data-access function once real
 * records exist. Throws if the record's own vendorId doesn't match the
 * vendorId the request is scoped to — fail closed, not open.
 *
 * Today there is no `record.vendorId` to check (sample data has none), so
 * this is a guard clause with nothing to guard yet — it exists so the
 * calling convention is established now, not invented under pressure later
 * when the first real query is written.
 */
export function assertVendorScope(requestVendorId: string, recordVendorId: string): void {
  if (requestVendorId !== recordVendorId) {
    throw new VendorScopeError(
      `Vendor scope violation: request scoped to vendor "${requestVendorId}" but record belongs to vendor "${recordVendorId}".`
    );
  }
}
