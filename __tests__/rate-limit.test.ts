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

import { attempt, emailKey, requestAddress, type Limit } from "@/lib/rate-limit";

const limit: Limit = { bucket: "sign-in:address", max: 3, windowMs: 15 * 60 * 1000 };
const now = new Date("2026-11-01T12:00:00Z");

beforeEach(() => {
  jest.clearAllMocks();
  headerValues.clear();
  process.env.AUTH_SECRET = "test-secret-at-least-32-bytes-long-for-hs256";
  count.mockResolvedValue(1);
  create.mockResolvedValue({ id: "hit1" });
  deleteMany.mockResolvedValue({ count: 0 });
});

describe("attempt", () => {
  // Checked first and written after, every request in a burst read a count
  // below the limit before any of them was written: 200 sign-ins sent at
  // once all got their password checked. Written first and counted after,
  // requests at the same moment count each other.
  it("writes the attempt before it counts, so a burst sees itself", async () => {
    const order: string[] = [];
    create.mockImplementation(async () => (order.push("write"), { id: "hit1" }));
    count.mockImplementation(async () => (order.push("count"), 1));

    await attempt(limit, "k1", now);

    expect(order).toEqual(["write", "count"]);
    expect(create).toHaveBeenCalledWith({ data: { bucket: "sign-in:address", key: "k1", createdAt: now }, select: { id: true } });
  });

  it("counts the attempts in the window, this one included", async () => {
    await attempt(limit, "k1", now);

    expect(count).toHaveBeenCalledWith({
      where: { bucket: "sign-in:address", key: "k1", createdAt: { gte: new Date("2026-11-01T11:45:00Z") } },
    });
  });

  it("allows as many as the limit, and refuses the one after", async () => {
    count.mockResolvedValue(3);
    await expect(attempt(limit, "k1", now)).resolves.toMatchObject({ over: false });

    count.mockResolvedValue(4);
    await expect(attempt(limit, "k1", now)).resolves.toMatchObject({ over: true });
  });

  it("can be taken back off the count, when it turns out not to be one the limit is for", async () => {
    const made = await attempt(limit, "k1", now);

    await made.forget();

    expect(deleteMany).toHaveBeenLastCalledWith({ where: { id: "hit1" } });
  });

  it("clears out attempts older than the longest window as it writes", async () => {
    await attempt(limit, "k1", now);

    expect(deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: new Date("2026-10-31T12:00:00Z") } } });
  });
});

describe("emailKey", () => {
  // The raw email was the key: anything typed into the box, of any length,
  // stored and indexed - and a random one past 2,704 bytes broke the index,
  // so a failed sign-in answered with a server error.
  it("is a short keyed hash of the email, never the email itself", () => {
    const key = emailKey("njomza@nyoki.co.uk");

    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(emailKey("njomza@nyoki.co.uk")).toBe(key);
    expect(emailKey("someone@else.com")).not.toBe(key);
  });

  it("is as short for a megabyte as for an address", () => {
    expect(emailKey("x".repeat(1_000_000))).toMatch(/^[0-9a-f]{32}$/);
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

  it("never matches the key of an email that happens to read the same", async () => {
    headerValues.set("x-forwarded-for", "203.0.113.7");

    await expect(requestAddress()).resolves.not.toBe(emailKey("203.0.113.7"));
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
