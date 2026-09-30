import { prisma } from "@/lib/prisma";
import { withDatabaseTransaction } from "@/lib/databaseTransaction";

/** The advisory lock and all cooperating Prisma writes share one transaction. */
export async function withRecordLock<T>(scope: string, id: string, fn: () => Promise<T>): Promise<T> {
  return withDatabaseTransaction(prisma, async () => {
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${scope}:${id}`})::bigint)`;
    return fn();
  });
}
