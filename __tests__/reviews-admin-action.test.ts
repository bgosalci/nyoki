/**
 * @jest-environment node
 */
const findUnique = jest.fn();
const update = jest.fn();
const deleteMany = jest.fn();
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/db", () => ({
  db: {
    review: {
      findUnique: (args: unknown) => findUnique(args),
      update: (args: unknown) => update(args),
      deleteMany: (args: unknown) => deleteMany(args),
    },
  },
}));
jest.mock("../src/lib/auth/dal", () => ({ requireAdmin: jest.fn(async () => ({ sub: "admin" })) }));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { deleteReview, hideReview, publishReview, saveReply } from "@/app/admin/(protected)/reviews/actions";
import { requireAdmin } from "@/lib/auth/dal";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  jest.clearAllMocks();
  findUnique.mockResolvedValue({ id: "r1", product: { slug: "robin-card" } });
});

function refreshed() {
  expect(revalidatePath).toHaveBeenCalledWith("/product/robin-card");
  expect(revalidatePath).toHaveBeenCalledWith("/admin/reviews");
  expect(revalidatePath).toHaveBeenCalledWith("/admin");
}

describe("publishReview", () => {
  it("is for the shop's staff only", async () => {
    await publishReview(form({ id: "r1" }));

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("puts the review on the piece's page, saying when", async () => {
    await publishReview(form({ id: "r1" }));

    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "PUBLISHED", hiddenReason: null, moderatedAt: expect.any(Date) },
    });
    refreshed();
  });

  it("does nothing to a review deleted since the page was drawn", async () => {
    findUnique.mockResolvedValue(null);

    await publishReview(form({ id: "gone" }));

    expect(update).not.toHaveBeenCalled();
  });
});

describe("hideReview", () => {
  it("is for the shop's staff only", async () => {
    await hideReview(form({ id: "r1", reason: "OFFENSIVE" }));

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("keeps a review off the shop, or takes it off, for one of the reasons the policy names", async () => {
    await hideReview(form({ id: "r1", reason: "OFFENSIVE" }));

    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "HIDDEN", hiddenReason: "OFFENSIVE", moderatedAt: expect.any(Date) },
    });
    refreshed();
  });

  // The law forbids leaving out reviews for being unfavourable; a reason is
  // what shows a review was left out for something else.
  it("hides nothing without one of those reasons", async () => {
    await hideReview(form({ id: "r1", reason: "NEGATIVE" }));
    await hideReview(form({ id: "r1" }));

    expect(update).not.toHaveBeenCalled();
  });
});

describe("saveReply", () => {
  it("is for the shop's staff only", async () => {
    await saveReply({}, form({ id: "r1", reply: "Thank you!" }));

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("saves the shop's reply beneath the review, saying when", async () => {
    const result = await saveReply({}, form({ id: "r1", reply: " Thank you, Ada! " }));

    expect(result).toEqual({ saved: true });
    expect(update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { reply: "Thank you, Ada!", repliedAt: expect.any(Date) } });
    refreshed();
  });

  it("takes the reply away when it is emptied", async () => {
    await saveReply({}, form({ id: "r1", reply: "" }));

    expect(update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { reply: null, repliedAt: null } });
  });

  it("says when the reply is too long, and saves nothing", async () => {
    const result = await saveReply({}, form({ id: "r1", reply: "x".repeat(2001) }));

    expect(result).toEqual({ error: "Please keep the reply to 2,000 characters." });
    expect(update).not.toHaveBeenCalled();
  });

  it("says so when the review was deleted since the page was drawn", async () => {
    findUnique.mockResolvedValue(null);

    const result = await saveReply({}, form({ id: "gone", reply: "Thank you!" }));

    expect(result).toEqual({ error: "This review has been deleted." });
    expect(update).not.toHaveBeenCalled();
  });
});

describe("deleteReview", () => {
  it("is for the shop's staff only", async () => {
    await deleteReview(form({ id: "r1" }));

    expect(requireAdmin).toHaveBeenCalled();
  });

  it("deletes the review, and the reply with it", async () => {
    await deleteReview(form({ id: "r1" }));

    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "r1" } });
    refreshed();
  });
});
