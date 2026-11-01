/**
 * @jest-environment node
 */
const currentCustomer = jest.fn();
const productFirst = jest.fn();
const orderItemFirst = jest.fn();
const upsert = jest.fn();
const reviewFirst = jest.fn();
const deleteMany = jest.fn();
const revalidatePath = jest.fn();

// jest.mock() does not go through the @/ alias, so these are relative.
jest.mock("../src/lib/account/dal", () => ({ currentCustomer: () => currentCustomer() }));
jest.mock("../src/lib/db", () => ({
  db: {
    product: { findFirst: (args: unknown) => productFirst(args) },
    orderItem: { findFirst: (args: unknown) => orderItemFirst(args) },
    review: {
      upsert: (args: unknown) => upsert(args),
      findFirst: (args: unknown) => reviewFirst(args),
      deleteMany: (args: unknown) => deleteMany(args),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
const attempt = jest.fn();
const forget = jest.fn();
jest.mock("../src/lib/rate-limit", () => ({
  ...jest.requireActual("../src/lib/rate-limit"),
  attempt: (...args: unknown[]) => attempt(...args),
  emailKey: (email: string) => `key:${email}`,
}));

import { deleteOwnReview, writeReview } from "@/app/(shop)/product/[slug]/actions";
import { EVERYONE, REVIEWS_IN_ALL, REVIEWS_PER_SHOPPER } from "@/lib/rate-limit";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const shopper = { id: "c1", email: "ada@example.com", name: "Ada Lovelace" };
const written = { productId: "p1", rating: "5", body: "Beautiful, and beautifully wrapped.", name: "Ada L." };
const words = { rating: 5, body: "Beautiful, and beautifully wrapped.", name: "Ada L." };

beforeEach(() => {
  jest.clearAllMocks();
  currentCustomer.mockResolvedValue(shopper);
  productFirst.mockResolvedValue({ id: "p1", slug: "robin-card" });
  orderItemFirst.mockResolvedValue(null);
  upsert.mockResolvedValue({ id: "r1" });
  attempt.mockResolvedValue({ over: false, forget });
});

describe("writeReview", () => {
  it("keeps a new review to be read before it goes on the shop", async () => {
    const result = await writeReview({ errors: {} }, form(written));

    expect(result).toEqual({ errors: {}, sent: true });
    expect(productFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", status: "ACTIVE" } }));
    const { where, create } = upsert.mock.calls[0][0];
    expect(where).toEqual({ customerId_productId: { customerId: "c1", productId: "p1" } });
    expect(create).toEqual({
      customerId: "c1",
      productId: "p1",
      ...words,
      verifiedOrderNumber: null,
      createdAt: expect.any(Date),
      submittedAt: expect.any(Date),
    });
    // Written at one moment, so a changed review can be told from a new one.
    expect(create.submittedAt).toBe(create.createdAt);
  });

  it("says the review comes from someone who bought the piece, by the order that shows it", async () => {
    orderItemFirst.mockResolvedValue({ order: { orderNumber: "NYK-1042" } });

    await writeReview({ errors: {} }, form(written));

    expect(orderItemFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p1", order: { customerId: "c1", signedIn: true, status: { in: ["PAID", "FULFILLED", "REFUNDED"] } } },
      }),
    );
    expect(upsert.mock.calls[0][0].create.verifiedOrderNumber).toBe("NYK-1042");
  });

  // Changed words are new words: they wait to be read like any review.
  it("sends a changed review back to be read again, the reason it was not published gone with it", async () => {
    await writeReview({ errors: {} }, form(written));

    expect(upsert.mock.calls[0][0].update).toEqual({
      ...words,
      verifiedOrderNumber: null,
      status: "PENDING",
      hiddenReason: null,
      moderatedAt: null,
      submittedAt: expect.any(Date),
    });
  });

  it("looks again for a purchase when a review is changed", async () => {
    orderItemFirst.mockResolvedValue({ order: { orderNumber: "NYK-1050" } });

    await writeReview({ errors: {} }, form(written));

    expect(upsert.mock.calls[0][0].update.verifiedOrderNumber).toBe("NYK-1050");
  });

  it("puts the piece's page and the admin's lists in step", async () => {
    await writeReview({ errors: {} }, form(written));

    expect(revalidatePath).toHaveBeenCalledWith("/product/robin-card");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/reviews");
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("asks a shopper who is not signed in to sign in, and keeps nothing", async () => {
    currentCustomer.mockResolvedValue(null);

    const result = await writeReview({ errors: {} }, form(written));

    expect(result).toEqual({ errors: {}, notice: "Please sign in to write a review." });
    expect(upsert).not.toHaveBeenCalled();
    expect(attempt).not.toHaveBeenCalled();
  });

  it("says what is missing, and keeps nothing", async () => {
    const result = await writeReview({ errors: {} }, form({ ...written, rating: "" }));

    expect(result).toEqual({ errors: { rating: "Please choose how many stars to give it." } });
    expect(upsert).not.toHaveBeenCalled();
    expect(attempt).not.toHaveBeenCalled();
  });

  it("keeps no review of a piece that is not on the shop", async () => {
    productFirst.mockResolvedValue(null);

    const result = await writeReview({ errors: {} }, form(written));

    expect(result).toEqual({ errors: {}, notice: "This piece is no longer on the shop, so it cannot be reviewed." });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("writeReview's limits", () => {
  it("counts a review kept against the shopper, by a scrambled form of their email, and against everyone together", async () => {
    await writeReview({ errors: {} }, form(written));

    expect(attempt).toHaveBeenCalledWith(REVIEWS_PER_SHOPPER, "key:ada@example.com");
    expect(attempt).toHaveBeenCalledWith(REVIEWS_IN_ALL, EVERYONE);
    expect(forget).not.toHaveBeenCalled();
  });

  it("asks a shopper who has written many reviews in the hour to wait", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === REVIEWS_PER_SHOPPER, forget }));

    const result = await writeReview({ errors: {} }, form(written));

    expect(result).toEqual({ errors: {}, notice: "You have written several reviews in the last hour. Please wait a little before writing another." });
    expect(upsert).not.toHaveBeenCalled();
  });

  // Every review chimes on every open admin page, as a question does.
  it("keeps no more once the shop has had its fill for the hour, from everyone together", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === REVIEWS_IN_ALL, forget }));

    const result = await writeReview({ errors: {} }, form(written));

    expect(result).toEqual({ errors: {}, notice: "We can't take another review just now. Please try again a little later." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("takes a review it turns away back off both counts", async () => {
    attempt.mockImplementation(async (limit) => ({ over: limit === REVIEWS_IN_ALL, forget }));

    await writeReview({ errors: {} }, form(written));

    expect(forget).toHaveBeenCalledTimes(2);
  });
});

describe("deleteOwnReview", () => {
  beforeEach(() => reviewFirst.mockResolvedValue({ id: "r1", product: { slug: "robin-card" } }));

  it("deletes the shopper's own review, and only theirs", async () => {
    await deleteOwnReview(form({ id: "r1" }));

    expect(reviewFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "r1", customerId: "c1" } }));
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: "r1", customerId: "c1" } });
    expect(revalidatePath).toHaveBeenCalledWith("/product/robin-card");
  });

  it("deletes nothing of anyone else's", async () => {
    reviewFirst.mockResolvedValue(null);

    await deleteOwnReview(form({ id: "someone-elses" }));

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("deletes nothing for a shopper who is not signed in", async () => {
    currentCustomer.mockResolvedValue(null);

    await deleteOwnReview(form({ id: "r1" }));

    expect(reviewFirst).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
