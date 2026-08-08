/**
 * Centralized error registry — any error caught anywhere in the app gets
 * recorded here so it's visible to a Super Admin instead of only ever
 * reaching a browser console or a serverless function's ephemeral logs.
 *
 * Backed by the `ErrorLogEntry` Prisma table (see prisma/schema.prisma).
 * Was a JSON-file store; migrated to Postgres with the same function
 * names/behavior, now async to match Prisma's I/O.
 */

import { prisma } from "@/lib/prisma";

export type LoggedError = {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  /** Where it happened — a route path, a Server Action name, etc. */
  source: string;
  severity: "error" | "warning";
};

const MAX_ENTRIES = 200; // bounded so the table can't grow without limit

/**
 * Call this from any catch block, Server Action failure, or error
 * boundary. Safe to call liberally — failures inside logging itself are
 * swallowed (a broken logger must never be the thing that crashes a
 * request that was already failing).
 */
export async function logError(input: {
  message: string;
  stack?: string;
  source: string;
  severity?: "error" | "warning";
}): Promise<void> {
  try {
    await prisma.errorLogEntry.create({
      data: {
        id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        message: input.message,
        stack: input.stack,
        source: input.source,
        severity: input.severity ?? "error",
      },
    });

    const count = await prisma.errorLogEntry.count();
    if (count > MAX_ENTRIES) {
      const stale = await prisma.errorLogEntry.findMany({
        orderBy: { timestamp: "asc" },
        take: count - MAX_ENTRIES,
        select: { id: true },
      });
      await prisma.errorLogEntry.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    }
  } catch {
    // Never let logging itself throw.
  }
}

export async function getLoggedErrors(): Promise<LoggedError[]> {
  const rows = await prisma.errorLogEntry.findMany({ orderBy: { timestamp: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp.toISOString(),
    message: r.message,
    stack: r.stack ?? undefined,
    source: r.source,
    severity: r.severity as "error" | "warning",
  }));
}
