/**
 * @jest-environment node
 *
 * The Prisma client must be a singleton across hot reloads. Next's dev server
 * re-evaluates modules on every edit, and a fresh PrismaClient per reload
 * exhausts the Postgres connection limit within a few minutes of editing.
 *
 * Runs in the node environment because the pg driver reaches for Node crypto,
 * which jsdom does not provide.
 */

describe("db client", () => {
  const globalRef = globalThis as { __nyokiPrisma?: unknown };

  beforeEach(() => {
    jest.resetModules();
    delete globalRef.__nyokiPrisma;
  });

  afterEach(() => {
    delete globalRef.__nyokiPrisma;
  });

  it("reuses one instance across module re-evaluation", async () => {
    const first = (await import("@/lib/db")).db;

    jest.resetModules();
    const second = (await import("@/lib/db")).db;

    expect(second).toBe(first);
  });

  it("caches the instance on globalThis so hot reload can find it", async () => {
    const { db } = await import("@/lib/db");

    expect(globalRef.__nyokiPrisma).toBe(db);
  });
});
