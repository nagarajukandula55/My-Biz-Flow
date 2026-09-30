import { PrismaClient } from "@prisma/client";
import { transactionAwareClient } from "@/lib/databaseClientContext";

/**
 * Singleton PrismaClient. Next.js dev mode hot-reloads server modules, so
 * a naive `new PrismaClient()` at module scope would open a fresh
 * connection pool on every edit — this caches the instance on the global
 * object in development (not in production, where each cold start is
 * meant to get its own client) to avoid exhausting Postgres connections.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const baseClient = globalForPrisma.prisma ?? new PrismaClient();
export const prisma = transactionAwareClient(baseClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = baseClient;
}
