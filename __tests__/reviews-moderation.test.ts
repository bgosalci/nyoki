import { HIDDEN_REASONS, hiddenBecause, parseHiddenReason, reviewStatusLabel, shopperStatus } from "@/lib/reviews/moderation";
import { BOUGHT, purchaseOf } from "@/lib/reviews/purchase";
import { averageText, ratingLabel, ratingSummary, reviewCount } from "@/lib/reviews/summary";

describe("the reasons a review is not published", () => {
  // Only these, each named in the reviews policy, so a review cannot be
  // turned down for saying something unwelcome - which the law forbids.
  it("are offensive, personal details, advertising and not genuine", () => {
    expect(HIDDEN_REASONS.map((reason) => reason.value)).toEqual(["OFFENSIVE", "PERSONAL_DETAILS", "ADVERTISING", "NOT_GENUINE"]);
  });

  it("are never about the review being unfavourable", () => {
    for (const reason of HIDDEN_REASONS) {
      expect(`${reason.label} ${reason.says}`).not.toMatch(/negative|unfavourable|bad|low|star|rating/i);
    }
  });

  it("read only one of the reasons from a request", () => {
    expect(parseHiddenReason("OFFENSIVE")).toBe("OFFENSIVE");
    expect(parseHiddenReason("NOT_GENUINE")).toBe("NOT_GENUINE");
    expect(parseHiddenReason("NEGATIVE")).toBeNull();
    expect(parseHiddenReason("")).toBeNull();
    expect(parseHiddenReason(null)).toBeNull();
  });

  it("tell the shopper why, in a sentence", () => {
    expect(hiddenBecause("OFFENSIVE")).toBe("We have not published your review, because it is offensive, abusive or unlawful.");
    expect(hiddenBecause("PERSONAL_DETAILS")).toBe("We have not published your review, because it gives someone's personal details.");
    expect(hiddenBecause(null)).toBe("We have not published your review.");
  });
});

describe("a review's status", () => {
  it("reads as what is left to do, in the admin", () => {
    expect(reviewStatusLabel("PENDING")).toBe("Waiting");
    expect(reviewStatusLabel("PUBLISHED")).toBe("Published");
    expect(reviewStatusLabel("HIDDEN")).toBe("Not published");
  });

  it("tells the shopper where their own review stands", () => {
    expect(shopperStatus({ status: "PENDING", hiddenReason: null })).toBe(
      "Waiting to be read. We read every review before it goes on the shop.",
    );
    expect(shopperStatus({ status: "PUBLISHED", hiddenReason: null })).toBe("On the shop.");
    expect(shopperStatus({ status: "HIDDEN", hiddenReason: "ADVERTISING" })).toBe(
      "We have not published your review, because it advertises something or links elsewhere.",
    );
  });
});

describe("a verified purchase", () => {
  // A refund does not undo having had the piece: one sent back as faulty is
  // exactly what a review should be able to say.
  it("is an order paid for, sent or refunded - never one left unpaid or cancelled", () => {
    expect(BOUGHT).toEqual(["PAID", "FULFILLED", "REFUNDED"]);
  });

  // A guest order joins whichever account holds its email, and nothing yet
  // proves an email belongs to whoever registered it; only an order placed
  // signed in proves that this account bought the piece.
  it("is an order of the piece placed signed in to the reviewer's own account", () => {
    expect(purchaseOf("c1", "p1")).toEqual({
      productId: "p1",
      order: { customerId: "c1", signedIn: true, status: { in: ["PAID", "FULFILLED", "REFUNDED"] } },
    });
  });
});

describe("ratingSummary", () => {
  it("counts the reviews and averages their stars to one place", () => {
    expect(ratingSummary([5, 4, 5])).toEqual({ count: 3, tenths: 47 });
    expect(ratingSummary([5, 5, 4, 4, 5])).toEqual({ count: 5, tenths: 46 });
    expect(ratingSummary([1])).toEqual({ count: 1, tenths: 10 });
  });

  it("has no average with no reviews", () => {
    expect(ratingSummary([])).toEqual({ count: 0, tenths: null });
  });

  it("writes the average as stars out of five", () => {
    expect(averageText(47)).toBe("4.7");
    expect(averageText(50)).toBe("5.0");
    expect(ratingLabel(47)).toBe("Rated 4.7 out of 5");
    expect(ratingLabel(30)).toBe("Rated 3 out of 5");
  });

  it("counts reviews in words", () => {
    expect(reviewCount(1)).toBe("1 review");
    expect(reviewCount(12)).toBe("12 reviews");
  });
});
