/**
 * @jest-environment node
 */
const findMany = jest.fn();
const findUnique = jest.fn();
const update = jest.fn((args: { where: { id: string }; data: Record<string, unknown> }) => ({ update: args }));
const remove = jest.fn((args: { where: { id: string } }) => ({ delete: args }));
const queryRaw = jest.fn();
const transaction = jest.fn(async (steps: unknown[]) => steps);
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    category: {
      findMany: (args: unknown) => findMany(args),
      findUnique: (args: unknown) => findUnique(args),
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => update(args),
      delete: (args: { where: { id: string } }) => remove(args),
    },
    $queryRaw: (...args: unknown[]) => queryRaw(...args),
    $transaction: (steps: unknown[]) => transaction(steps),
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));

import { deleteCategory, moveCategory, updateCategory } from "@/app/admin/(protected)/categories/actions";
import { requireAdmin } from "@/lib/auth/dal";
import { CATEGORY_ORDER } from "@/lib/categories/ordering";

/** In the shop's order: Accessories, Cards (Birthday, Christmas inside), Clothing. */
const tree = [
  { id: "acc", parentId: null, position: 1 },
  { id: "cards", parentId: null, position: 2 },
  { id: "birthday", parentId: "cards", position: 3 },
  { id: "christmas", parentId: "cards", position: 4 },
  { id: "clothing", parentId: null, position: 5 },
];

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockImplementation(async (args: { where?: { parentId?: string; slug?: unknown } }) => {
    // No web address is taken, so a save keeps the one it asked for.
    if (args?.where?.slug) return [];
    return args?.where?.parentId ? tree.filter((row) => row.parentId === args.where!.parentId) : tree;
  });
});

const written = () => Object.fromEntries(update.mock.calls.map(([args]) => [args.where.id, args.data]));

describe("moveCategory", () => {
  it("is for the shop's staff only", async () => {
    await moveCategory("clothing", "acc", "before");

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("reads the categories in the order the shop shows them", async () => {
    await moveCategory("clothing", "acc", "before");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: CATEGORY_ORDER }));
  });

  it("moves a category among its siblings by handing round their keys, in one transaction", async () => {
    await expect(moveCategory("clothing", "acc", "before")).resolves.toEqual({ ok: true });

    expect(written()).toEqual({ clothing: { position: 1 }, acc: { position: 2 }, cards: { position: 5 } });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("refreshes the categories list and the shop, whose header and tiles follow it", async () => {
    await moveCategory("clothing", "acc", "before");

    expect(revalidatePath).toHaveBeenCalledWith("/admin/categories");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("writes nothing for a category dropped where it already is", async () => {
    await expect(moveCategory("cards", "acc", "after")).resolves.toEqual({ ok: true });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses to move a category into another group", async () => {
    await expect(moveCategory("birthday", "clothing", "after")).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a category or a place it does not know", async () => {
    await expect(moveCategory("gone", "acc", "before")).resolves.toEqual({ ok: false });
    await expect(moveCategory("clothing", "acc", "sideways" as never)).resolves.toEqual({ ok: false });

    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("a category given another parent", () => {
  function form(fields: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    return data;
  }

  it("goes last in its new group, taking a fresh key from the sequence", async () => {
    findUnique.mockResolvedValue({ parentId: null });
    queryRaw.mockResolvedValue([{ position: BigInt(42) }]);

    await updateCategory("acc", { errors: {} }, form({ name: "Accessories", parentId: "cards" }));

    expect(written().acc).toEqual(expect.objectContaining({ parentId: "cards", position: 42 }));
  });

  it("keeps its place when the parent stays the same", async () => {
    findUnique.mockResolvedValue({ parentId: "cards" });

    await updateCategory("birthday", { errors: {} }, form({ name: "Birthday Cards", parentId: "cards" }));

    expect(written().birthday).not.toHaveProperty("position");
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("saves the colour of its name, and redraws the shop's header, which shows it", async () => {
    findUnique.mockResolvedValue({ parentId: null });

    await updateCategory("acc", { errors: {} }, form({ name: "Accessories", labelColour: "nyoki-sage-deep" }));

    expect(written().acc).toEqual(expect.objectContaining({ labelColour: "nyoki-sage-deep" }));
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("saves its status, and redraws the whole shop, every page of which leaves an inactive one out", async () => {
    findUnique.mockResolvedValue({ parentId: null });

    await updateCategory("acc", { errors: {} }, form({ name: "Accessories" }));
    expect(written().acc).toEqual(expect.objectContaining({ active: false }));

    await updateCategory("acc", { errors: {} }, form({ name: "Accessories", active: "on" }));
    expect(written().acc).toEqual(expect.objectContaining({ active: true }));
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("deleteCategory", () => {
  it("lifts what was inside it to the end of the top level, in its order, before deleting it", async () => {
    queryRaw.mockResolvedValue([{ position: BigInt(61) }, { position: BigInt(60) }]);

    await deleteCategory("cards");

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { parentId: "cards" }, orderBy: CATEGORY_ORDER }));
    expect(written()).toEqual({
      birthday: { parentId: null, position: 60 },
      christmas: { parentId: null, position: 61 },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    const steps = transaction.mock.calls[0][0] as unknown[];
    expect(steps.at(-1)).toEqual({ delete: { where: { id: "cards" } } });
  });

  it("asks for no keys when there is nothing inside it", async () => {
    await deleteCategory("clothing");

    expect(queryRaw).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith({ where: { id: "clothing" } });
  });
});
