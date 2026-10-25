/**
 * @jest-environment node
 */
const count = jest.fn();
const findFirst = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: { question: { count: (args: unknown) => count(args), findFirst: (args: unknown) => findFirst(args) } },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));

import { NextRequest } from "next/server";

import { GET } from "@/app/admin/(protected)/questions/waiting/route";
import { requireAdmin } from "@/lib/auth/dal";

const SINCE = "2026-10-25T21:00:00.000Z";
const ask = (query = "") => GET(new NextRequest(`http://localhost/admin/questions/waiting${query}`));

beforeEach(() => {
  jest.clearAllMocks();
  count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => ("createdAt" in where ? 1 : 3));
  findFirst.mockResolvedValue({ name: "Ada", productName: "Girl’s Coat" });
});

describe("GET /admin/questions/waiting", () => {
  it("is for the shop's staff only", async () => {
    await ask(`?since=${SINCE}`);

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("counts what waits, what arrived since the last look, and who sent the newest of those", async () => {
    const body = await (await ask(`?since=${SINCE}`)).json();

    expect(body).toEqual({ waiting: 3, arrived: 1, newest: { name: "Ada", productName: "Girl’s Coat" }, checkedAt: expect.any(String) });
    expect(count).toHaveBeenCalledWith({ where: { answeredAt: null } });
    // Up to the moment it looked, so the next look - from that moment - counts nothing twice.
    expect(count).toHaveBeenCalledWith({ where: { createdAt: { gt: new Date(SINCE), lte: new Date(body.checkedAt) } } });
  });

  it("counts nothing as arrived with no time, or no sensible time, to count from", async () => {
    for (const query of ["", "?since=yesterday"]) {
      const body = await (await ask(query)).json();
      expect(body).toMatchObject({ waiting: 3, arrived: 0, newest: null });
    }
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("is never cached, since it is asked again and again", async () => {
    expect((await ask(`?since=${SINCE}`)).headers.get("cache-control")).toContain("no-store");
  });
});
