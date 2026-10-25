/**
 * @jest-environment node
 */
const update = jest.fn();
const deleteMany = jest.fn();
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: { question: { update: (args: unknown) => update(args), deleteMany: (args: unknown) => deleteMany(args) } },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { deleteQuestion, setQuestionAnswered } from "@/app/admin/(protected)/questions/actions";
import { requireAdmin } from "@/lib/auth/dal";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => jest.clearAllMocks());

describe("setQuestionAnswered", () => {
  it("is for the shop's staff only", async () => {
    await setQuestionAnswered(form({ id: "q1", answered: "true" }));

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("marks a question answered, with when, and back to waiting", async () => {
    await setQuestionAnswered(form({ id: "q1", answered: "true" }));
    expect(update).toHaveBeenLastCalledWith({ where: { id: "q1" }, data: { answeredAt: expect.any(Date) } });

    await setQuestionAnswered(form({ id: "q1", answered: "false" }));
    expect(update).toHaveBeenLastCalledWith({ where: { id: "q1" }, data: { answeredAt: null } });
  });

  it("refreshes the Questions list and the Overview's count", async () => {
    await setQuestionAnswered(form({ id: "q1", answered: "true" }));

    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("deleteQuestion", () => {
  it("deletes it outright, and does not mind one already gone", async () => {
    await deleteQuestion(form({ id: "q1" }));

    expect(requireAdmin).toHaveBeenCalled();
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "q1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/questions");
  });
});
