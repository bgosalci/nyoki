/**
 * @jest-environment node
 */
const questionCount = jest.fn();
const questionFirst = jest.fn();
const reviewCount = jest.fn();
const reviewFirst = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    question: { count: (args: unknown) => questionCount(args), findFirst: (args: unknown) => questionFirst(args) },
    review: { count: (args: unknown) => reviewCount(args), findFirst: (args: unknown) => reviewFirst(args) },
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));

import { NextRequest } from "next/server";

import { GET } from "@/app/admin/(protected)/waiting/route";
import { requireAdmin } from "@/lib/auth/dal";

const SINCE = "2026-10-25T21:00:00.000Z";
const ask = (query = "") => GET(new NextRequest(`http://localhost/admin/waiting${query}`));

const written = new Date("2026-10-25T21:00:05.000Z");

beforeEach(() => {
  jest.clearAllMocks();
  questionCount.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => ("createdAt" in where ? 1 : 3));
  questionFirst.mockResolvedValue({ name: "Ada", productName: "Girl’s Coat" });
  reviewCount.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => ("submittedAt" in where ? 1 : 2));
  reviewFirst.mockResolvedValue({ name: "Bo P.", createdAt: written, submittedAt: written, product: { name: "Robin Card" } });
});

describe("GET /admin/waiting", () => {
  it("is for the shop's staff only", async () => {
    await ask(`?since=${SINCE}`);

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("counts the questions that wait, what arrived since the last look, and who sent the newest of those", async () => {
    const body = await (await ask(`?since=${SINCE}`)).json();

    expect(body.questions).toEqual({ waiting: 3, arrived: 1, newest: { name: "Ada", productName: "Girl’s Coat" } });
    expect(questionCount).toHaveBeenCalledWith({ where: { answeredAt: null } });
    // Up to the moment it looked, so the next look - from that moment - counts nothing twice.
    expect(questionCount).toHaveBeenCalledWith({ where: { createdAt: { gt: new Date(SINCE), lte: new Date(body.checkedAt) } } });
  });

  it("counts the reviews waiting to be read, and those written or changed since the last look", async () => {
    const body = await (await ask(`?since=${SINCE}`)).json();

    expect(body.reviews).toEqual({ waiting: 2, arrived: 1, newest: { name: "Bo P.", productName: "Robin Card", changed: false } });
    expect(reviewCount).toHaveBeenCalledWith({ where: { status: "PENDING" } });
    expect(reviewCount).toHaveBeenCalledWith({ where: { submittedAt: { gt: new Date(SINCE), lte: new Date(body.checkedAt) } } });
  });

  it("says when the newest review was changed, rather than written new", async () => {
    reviewFirst.mockResolvedValue({ name: "Bo P.", createdAt: new Date("2026-10-20T09:00:00Z"), submittedAt: written, product: { name: "Robin Card" } });

    const body = await (await ask(`?since=${SINCE}`)).json();

    expect(body.reviews.newest).toEqual({ name: "Bo P.", productName: "Robin Card", changed: true });
  });

  it("counts nothing as arrived with no time, or no sensible time, to count from", async () => {
    for (const query of ["", "?since=yesterday"]) {
      const body = await (await ask(query)).json();
      expect(body.questions).toEqual({ waiting: 3, arrived: 0, newest: null });
      expect(body.reviews).toEqual({ waiting: 2, arrived: 0, newest: null });
    }
    expect(questionFirst).not.toHaveBeenCalled();
    expect(reviewFirst).not.toHaveBeenCalled();
  });

  it("is never cached, since it is asked again and again", async () => {
    expect((await ask(`?since=${SINCE}`)).headers.get("cache-control")).toContain("no-store");
  });
});
