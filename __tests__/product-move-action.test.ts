/**
 * @jest-environment node
 */
const findMany = jest.fn();
const update = jest.fn((args: { where: { id: string }; data: { sortKey: number } }) => ({ update: args }));
const transaction = jest.fn(async (steps: unknown[]) => steps);
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    product: {
      findMany: (args: unknown) => findMany(args),
      update: (args: { where: { id: string }; data: { sortKey: number } }) => update(args),
    },
    $transaction: (steps: unknown[]) => transaction(steps),
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { moveProduct } from "@/app/admin/(protected)/products/actions";
import { requireAdmin } from "@/lib/auth/dal";

/** Read highest first: a, b, c, d - with an archived piece, x, between b and c. */
const catalogue = [
  { id: "a", sortKey: 50, status: "ACTIVE" },
  { id: "b", sortKey: 40, status: "ACTIVE" },
  { id: "x", sortKey: 35, status: "ARCHIVED" },
  { id: "c", sortKey: 30, status: "ACTIVE" },
  { id: "d", sortKey: 20, status: "ACTIVE" },
];

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue(catalogue);
});

const written = () => Object.fromEntries(update.mock.calls.map(([args]) => [args.where.id, args.data.sortKey]));

describe("moveProduct", () => {
  it("is for the shop's staff only", async () => {
    await moveProduct("d", "a", "before");

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("moves a piece by shuffling the keys of the rows it passes, in one transaction", async () => {
    await expect(moveProduct("d", "b", "before")).resolves.toEqual({ ok: true });

    expect(written()).toEqual({ d: 40, b: 35, x: 30, c: 20 });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("refreshes the products list and the shop", async () => {
    await moveProduct("d", "a", "before");

    expect(revalidatePath).toHaveBeenCalledWith("/admin/products");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("writes nothing for a piece dropped where it already is", async () => {
    await expect(moveProduct("b", "a", "after")).resolves.toEqual({ ok: true });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses to move a piece among pieces of another status, which the list keeps apart", async () => {
    await expect(moveProduct("x", "a", "before")).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a piece or a place it does not know", async () => {
    await expect(moveProduct("gone", "a", "before")).resolves.toEqual({ ok: false });
    await expect(moveProduct("d", "a", "sideways" as never)).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });
});
