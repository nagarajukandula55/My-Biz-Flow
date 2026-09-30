import { AsyncLocalStorage } from "node:async_hooks";
import { setTransactionProvider } from "@/lib/databaseClientContext";
export { transactionAwareClient, inDatabaseTransaction } from "@/lib/databaseClientContext";
import type { Prisma, PrismaClient } from "@prisma/client";

type Context = { client: Prisma.TransactionClient; afterCommit: (() => Promise<unknown>)[] };
const context = new AsyncLocalStorage<Context>();
setTransactionProvider(() => context.getStore());

export async function withDatabaseTransaction<T>(client: PrismaClient, work: () => Promise<T>): Promise<T> {
  if (context.getStore()) return work();
  const afterCommit: Context["afterCommit"] = [];
  const result = await client.$transaction(tx => context.run({ client: tx, afterCommit }, work), { timeout: 30_000 });
  for (const effect of afterCommit) {
    try { await effect(); } catch (error) { console.error("[after-commit] Delivery failed", error); }
  }
  return result;
}

/** External delivery must not happen for work that subsequently rolls back. */
export async function afterDatabaseCommit(effect: () => Promise<unknown>): Promise<void> {
  const current = context.getStore();
  if (current) current.afterCommit.push(effect);
  else await effect();
}
