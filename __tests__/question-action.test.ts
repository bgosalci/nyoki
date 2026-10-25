/**
 * @jest-environment node
 */
const count = jest.fn();
const create = jest.fn();
const findFirst = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    question: { count: (args: unknown) => count(args), create: (args: unknown) => create(args) },
    product: { findFirst: (args: unknown) => findFirst(args) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { askQuestion } from "@/app/(shop)/contact/actions";
import { HONEYPOT } from "@/lib/questions/validate";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const asked = { name: "Ada", email: "ada@example.com", message: "Do you have it in 5-6 years?" };

beforeEach(() => {
  jest.clearAllMocks();
  count.mockResolvedValue(0);
  create.mockResolvedValue({ id: "q1" });
  findFirst.mockResolvedValue({ id: "p1", name: "Girl’s Coat" });
});

describe("askQuestion", () => {
  it("keeps the question with the piece it was asked about, and the piece's name as it stands", async () => {
    const result = await askQuestion({ errors: {} }, form({ ...asked, productId: "p1" }));

    expect(result).toEqual({ errors: {}, sent: { name: "Ada" } });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", status: "ACTIVE" } }));
    expect(create).toHaveBeenCalledWith({ data: { ...asked, productId: "p1", productName: "Girl’s Coat" } });
  });

  it("keeps a question from the Contact page, about no piece", async () => {
    await askQuestion({ errors: {} }, form(asked));

    expect(findFirst).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({ data: { ...asked, productId: null, productName: null } });
  });

  it("keeps the question, without a piece, when the piece is no longer on the shop", async () => {
    findFirst.mockResolvedValue(null);

    await askQuestion({ errors: {} }, form({ ...asked, productId: "gone" }));

    expect(create).toHaveBeenCalledWith({ data: { ...asked, productId: null, productName: null } });
  });

  it("says what is missing, and keeps nothing", async () => {
    const result = await askQuestion({ errors: {} }, form({ ...asked, message: " " }));

    expect(result).toEqual({ errors: { message: "Please write your question." } });
    expect(create).not.toHaveBeenCalled();
  });

  it("tells a bot that filled in the hidden box that it worked, and keeps nothing", async () => {
    const result = await askQuestion({ errors: {} }, form({ ...asked, [HONEYPOT]: "https://spam.example" }));

    expect(result).toEqual({ errors: {}, sent: { name: "Ada" } });
    expect(count).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("asks someone who has sent five questions in the last hour to wait", async () => {
    count.mockResolvedValue(5);
    const before = Date.now();

    const result = await askQuestion({ errors: {} }, form(asked));

    expect(result).toEqual({ errors: {}, notice: "You have sent several questions in the last hour. Please wait a little before sending another." });
    expect(create).not.toHaveBeenCalled();
    const where = count.mock.calls[0][0].where;
    expect(where.email).toBe("ada@example.com");
    expect(before - where.createdAt.gte.getTime()).toBeGreaterThanOrEqual(60 * 60 * 1000 - 1000);
  });
});
