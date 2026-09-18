import { prisma } from "@/lib/prisma";

/**
 * Serializes concurrent work against the same logical record (e.g. one
 * workorder) using a Postgres advisory lock keyed by a stable hash of
 * `${scope}:${id}`. This app has ONE login per business, not per staff
 * member (see partnerSession.ts) — so multiple physical staff sessions
 * acting on the same partner account concurrently is the normal case, not
 * an edge case. The Service Centre workorder actions (patch/cancel/hold/
 * deduct-inventory/create-invoice) all do a read-modify-write over a
 * BusinessRecord's JSON blob with no transaction or version check; two
 * staff touching the same workorder at once could otherwise double-deduct
 * stock or silently overwrite each other's edit. Wrapping each action's
 * body in this lock serializes them per workorder without needing every
 * inner Prisma call to run on the same connection — Postgres blocks any
 * other session trying to acquire the SAME lock key at the SQL level
 * until this transaction commits or rolls back, regardless of which
 * connection the wrapped work itself uses.
 */
export async function withRecordLock<T>(scope: string, id: string, fn: () => Promise<T>): Promise<T> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope}:${id}`})::bigint)`;
      return fn();
    },
    // Generous — the wrapped work can include several sequential awaits
    // (stock lookups, a Telegram send, numbering) that would blow past
    // Prisma's 5s default transaction timeout despite doing real, necessary
    // work, not hanging.
    { timeout: 30_000 }
  );
}
