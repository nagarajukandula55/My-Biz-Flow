import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient. Next.js dev mode hot-reloads server modules, so
 * a naive `new PrismaClient()` at module scope would open a fresh
 * connection pool on every edit — this caches the instance on the global
 * object in development (not in production, where each cold start is
 * meant to get its own client) to avoid exhausting Postgres connections.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
