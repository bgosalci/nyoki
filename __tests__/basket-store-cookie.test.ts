/**
 * @jest-environment node
 */
const cookieValue = { current: undefined as string | undefined };
const setCookie = jest.fn();
const findFirst = jest.fn();
const create = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (cookieValue.current === undefined ? undefined : { value: cookieValue.current }),
    set: (...args: unknown[]) => setCookie(...args),
  }),
}));
jest.mock("../src/lib/account/dal", () => ({ currentCustomer: async () => null }));
jest.mock("../src/lib/db", () => ({
  db: { basket: { findFirst: (args: unknown) => findFirst(args), create: (args: unknown) => create(args) } },
}));

import { signBasketId } from "@/lib/basket/cookie";
import { BASKET_COOKIE, basketIdForWriting, findBasketId } from "@/lib/basket/store";

const SECRET = "test-secret-at-least-32-bytes-long-for-hs256";

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AUTH_SECRET = SECRET;
  cookieValue.current = undefined;
  findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => ({ id: where.id }));
  create.mockResolvedValue({ id: "new-basket" });
});

describe("a guest's basket, by its cookie", () => {
  it("is found by a cookie this shop signed", async () => {
    cookieValue.current = signBasketId("b1", SECRET);

    await expect(findBasketId()).resolves.toBe("b1");
  });

  it("is not found by a bare id, however it was come by", async () => {
    cookieValue.current = "b1";

    await expect(findBasketId()).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("is named by a signed cookie when it is made", async () => {
    await expect(basketIdForWriting()).resolves.toBe("new-basket");

    expect(setCookie).toHaveBeenCalledWith(BASKET_COOKIE, signBasketId("new-basket", SECRET), expect.objectContaining({ httpOnly: true }));
  });
});
