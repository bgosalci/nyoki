/**
 * @jest-environment node
 */
const count = jest.fn();
const create = jest.fn();
const deleteMany = jest.fn();
const headerValues = new Map<string, string>();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    rateLimitHit: {
      count: (args: unknown) => count(args),
      create: (args: unknown) => create(args),
      deleteMany: (args: unknown) => deleteMany(args),
    },
  },
}));
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({ get: (name: string) => headerValues.get(name) ?? null })),
}));

import { isLimited, recordAttempt, requestAddress, type Limit } from "@/lib/rate-limit";

const limit: Limit = { bucket: "sign-in:address", max: 3, windowMs: 15 * 60 * 1000 };
const now = new Date("2026-11-01T12:00:00Z");

beforeEach(() => {
  jest.clearAllMocks();
  headerValues.clear();
  process.env.AUTH_SECRET = "test-secret-at-least-32-bytes-long-for-hs256";
  count.mockResolvedValue(0);
  create.mockResolvedValue({});
  deleteMany.mockResolvedValue({ count: 0 });
});

describe("isLimited", () => {
  it("counts the attempts in the window, by what they were and who made them", async () => {
    count.mockResolvedValue(2);

    await expect(isLimited(limit, "k1", now)).resolves.toBe(false);
    expect(count).toHaveBeenCalledWith({
      where: { bucket: "sign-in:address", key: "k1", createdAt: { gte: new Date("2026-11-01T11:45:00Z") } },
    });
  });

  it("is limited once the attempts reach the most allowed", async () => {
    count.mockResolvedValue(3);

    await expect(isLimited(limit, "k1", now)).resolves.toBe(true);
  });
});

describe("recordAttempt", () => {
  it("writes the attempt, and clears out any older than the longest window", async () => {
    await recordAttempt(limit, "k1", now);

    expect(create).toHaveBeenCalledWith({ data: { bucket: "sign-in:address", key: "k1", createdAt: now } });
    expect(deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-10-31T12:00:00Z") } } });
  });
});

describe("requestAddress", () => {
  it("names the address a request came from by a hash, never the address itself", async () => {
    headerValues.set("x-forwarded-for", "203.0.113.7, 10.0.0.1");

    const key = await requestAddress();

    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(key).not.toContain("203.0.113.7");
  });

  it("takes the first address a proxy lists, which is the visitor's", async () => {
    headerValues.set("x-forwarded-for", "203.0.113.7, 10.0.0.1");
    const listed = await requestAddress();

    headerValues.set("x-forwarded-for", "203.0.113.7");
    await expect(requestAddress()).resolves.toBe(listed);
  });

  it("tells two visitors apart", async () => {
    headerValues.set("x-forwarded-for", "203.0.113.7");
    const one = await requestAddress();

    headerValues.set("x-forwarded-for", "198.51.100.2");
    await expect(requestAddress()).resolves.not.toBe(one);
  });

  it("falls back to x-real-ip, then to one shared name", async () => {
    headerValues.set("x-real-ip", "203.0.113.7");
    const real = await requestAddress();
    headerValues.set("x-forwarded-for", "203.0.113.7");
    await expect(requestAddress()).resolves.toBe(real);

    headerValues.clear();
    await expect(requestAddress()).resolves.toMatch(/^[0-9a-f]{32}$/);
  });
});
