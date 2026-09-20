import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Shared Prisma client.
 *
 * Cached on globalThis because Next's dev server re-evaluates modules on every
 * edit. Without the cache each hot reload opens a new pool and Postgres starts
 * refusing connections after a few minutes of work. In production the module is
 * evaluated once and the cache is simply unused.
 */

const globalForPrisma = globalThis as unknown as {
  __nyokiPrisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });
}

export const db: PrismaClient =
  globalForPrisma.__nyokiPrisma ?? createClient();

globalForPrisma.__nyokiPrisma = db;
