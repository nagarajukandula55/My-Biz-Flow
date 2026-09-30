import type { Prisma, PrismaClient } from "@prisma/client";

// Browser-safe indirection: only the server transaction module installs a provider.
let currentTransaction: () => { client: Prisma.TransactionClient } | undefined = () => undefined;
export function setTransactionProvider(provider: typeof currentTransaction): void { currentTransaction = provider; }
export const inDatabaseTransaction = () => Boolean(currentTransaction());

/** Retains the existing client API while routing cooperating helpers to one transaction. */
export function transactionAwareClient(base: PrismaClient): PrismaClient {
  return new Proxy(base, {
    get(target, key) {
      const current = currentTransaction();
      if (current && key === "$transaction") {
        return (work: ((tx: Prisma.TransactionClient) => Promise<unknown>) | Promise<unknown>[]) =>
          typeof work === "function" ? work(current.client) : Promise.all(work);
      }
      const client = current?.client ?? target;
      const value = Reflect.get(client, key);
      return typeof value === "function" ? value.bind(client) : value;
    },
  });
}
