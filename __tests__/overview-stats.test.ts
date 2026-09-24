import { overviewStats } from "@/lib/admin/overview";

const NOW = new Date("2026-09-24T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const at = (offsetDays: number) => new Date(NOW.getTime() + offsetDays * day);

const sale = (overrides: Partial<{ active: boolean; startsAt: Date; endsAt: Date | null }> = {}) => ({
  type: "PERCENTAGE" as const,
  value: 20,
  active: true,
  startsAt: at(-1),
  endsAt: null,
  ...overrides,
});

const code = (overrides: Partial<{ active: boolean; startsAt: Date; endsAt: Date | null; usageLimit: number | null; usedCount: number; minSpendPence: number | null }> = {}) => ({
  type: "PERCENTAGE" as const,
  value: 10,
  minSpendPence: null,
  usageLimit: null,
  usedCount: 0,
  active: true,
  startsAt: at(-1),
  endsAt: null,
  ...overrides,
});

const counts = { live: 231, drafts: 6, toFulfil: 0 };
const value = (stats: ReturnType<typeof overviewStats>, label: string) => stats.find((stat) => stat.label === label)?.value;

describe("overviewStats", () => {
  it("counts products and orders as given", () => {
    const stats = overviewStats({ ...counts, sales: [], codes: [] }, NOW);

    expect(stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Live products", 231],
      ["Drafts", 6],
      ["Orders to fulfil", 0],
      ["Running sales", 0],
      ["Live promo codes", 0],
    ]);
  });

  it("counts a sale as running only while it is switched on and between its dates, as the shop prices it", () => {
    const sales = [
      sale(),
      sale({ endsAt: at(3) }),
      sale({ active: false }), // switched off
      sale({ startsAt: at(2) }), // not started
      sale({ startsAt: at(-10), endsAt: at(-1) }), // over
    ];

    expect(value(overviewStats({ ...counts, sales, codes: [] }, NOW), "Running sales")).toBe(2);
  });

  it("counts a promo code as live only while a shopper could use it, as checkout decides", () => {
    const codes = [
      code(),
      code({ minSpendPence: 3000 }), // live: a minimum spend is the shopper's to meet
      code({ usageLimit: 50, usedCount: 12 }),
      code({ usageLimit: 50, usedCount: 50 }), // used up
      code({ active: false }),
      code({ startsAt: at(1) }),
      code({ endsAt: at(-1), startsAt: at(-5) }),
    ];

    expect(value(overviewStats({ ...counts, sales: [], codes }, NOW), "Live promo codes")).toBe(3);
  });

  it("says how many sales are scheduled to start, beside those running", () => {
    const sales = [
      sale(), // running
      sale({ startsAt: at(2) }), // scheduled
      sale({ startsAt: at(30), endsAt: at(40) }), // scheduled
      sale({ startsAt: at(2), active: false }), // switched off: it will not start on its own
      sale({ startsAt: at(-10), endsAt: at(-1) }), // over
    ];
    const running = overviewStats({ ...counts, sales, codes: [] }, NOW).find((stat) => stat.label === "Running sales");

    expect(running).toMatchObject({ value: 1, detail: "2 scheduled" });
  });

  it("says how many promo codes are scheduled to start, beside those live", () => {
    const codes = [
      code(), // live
      code({ startsAt: at(1) }), // scheduled
      code({ startsAt: at(1), active: false }), // switched off
      code({ startsAt: at(1), usageLimit: 5, usedCount: 5 }), // used up before it starts: it never will
    ];
    const live = overviewStats({ ...counts, sales: [], codes }, NOW).find((stat) => stat.label === "Live promo codes");

    expect(live).toMatchObject({ value: 1, detail: "1 scheduled" });
  });

  it("says plainly when nothing is scheduled, and adds nothing to the other figures", () => {
    const stats = overviewStats({ ...counts, sales: [sale()], codes: [code()] }, NOW);

    expect(Object.fromEntries(stats.map((stat) => [stat.label, stat.detail]))).toEqual({
      "Live products": undefined,
      Drafts: undefined,
      "Orders to fulfil": undefined,
      "Running sales": "None scheduled",
      "Live promo codes": "None scheduled",
    });
  });

  it("links each figure to the page behind it", () => {
    const stats = overviewStats({ ...counts, sales: [], codes: [] }, NOW);

    expect(Object.fromEntries(stats.map((stat) => [stat.label, stat.href]))).toEqual({
      "Live products": "/admin/products?status=ACTIVE",
      Drafts: "/admin/products?status=DRAFT",
      "Orders to fulfil": "/admin/orders",
      "Running sales": "/admin/sales",
      "Live promo codes": "/admin/codes",
    });
  });
});
