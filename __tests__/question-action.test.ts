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
const attempt = jest.fn();
const forget = jest.fn();
jest.mock("../src/lib/rate-limit", () => ({
  ...jest.requireActual("../src/lib/rate-limit"),
  attempt: (...args: unknown[]) => attempt(...args),
  requestAddress: async () => "address-hash",
}));

import { askQuestion } from "@/app/(shop)/contact/actions";
import { HONEYPOT } from "@/lib/questions/validate";
import { EVERYONE, QUESTIONS_IN_ALL, QUESTIONS_PER_ADDRESS } from "@/lib/rate-limit";

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
  attempt.mockResolvedValue({ over: false, forget });
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

describe("askQuestion's limits beyond the email", () => {
  // Said to someone who may have sent nothing at all - the address can be a
  // whole office's, and the ceiling is everyone's - so it blames nobody.
  const busy = { errors: {}, notice: "We can't take another question just now. Please try again a little later." };

  // The email's own five an hour is beaten by changing the email each time.
  it("turns away a sixth question in the hour from one address, whatever email it gives", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === QUESTIONS_PER_ADDRESS, forget }));

    await expect(askQuestion({ errors: {} }, form(asked))).resolves.toEqual(busy);
    expect(attempt).toHaveBeenCalledWith(QUESTIONS_PER_ADDRESS, "address-hash");
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps no more once the shop has had its fill for the hour, from everyone together", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === QUESTIONS_IN_ALL, forget }));

    await expect(askQuestion({ errors: {} }, form(asked))).resolves.toEqual(busy);
    expect(attempt).toHaveBeenCalledWith(QUESTIONS_IN_ALL, EVERYONE);
    expect(create).not.toHaveBeenCalled();
  });

  // Only questions kept count, so a flood turned away cannot hold the
  // hour's ceiling shut with the requests it was turned away for.
  it("takes a question it turns away back off both counts", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === QUESTIONS_IN_ALL, forget }));

    await askQuestion({ errors: {} }, form(asked));

    expect(forget).toHaveBeenCalledTimes(2);
  });

  it("takes it back off when it is the email's five that turn it away, too", async () => {
    count.mockResolvedValue(5);

    await askQuestion({ errors: {} }, form(asked));

    expect(forget).toHaveBeenCalledTimes(2);
  });

  it("counts a question kept against both", async () => {
    await askQuestion({ errors: {} }, form(asked));

    expect(attempt).toHaveBeenCalledWith(QUESTIONS_PER_ADDRESS, "address-hash");
    expect(attempt).toHaveBeenCalledWith(QUESTIONS_IN_ALL, EVERYONE);
    expect(forget).not.toHaveBeenCalled();
  });

  it("counts nothing for a bot or a question sent back to be finished", async () => {
    await askQuestion({ errors: {} }, form({ ...asked, [HONEYPOT]: "x" }));
    await askQuestion({ errors: {} }, form({ ...asked, message: "" }));

    expect(attempt).not.toHaveBeenCalled();
  });
});
