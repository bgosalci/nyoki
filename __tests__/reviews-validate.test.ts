import { BODY_MAX, NAME_MAX, REPLY_MAX, parseReply, parseReview, shownName } from "@/lib/reviews/validate";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const good = { productId: " p1 ", rating: "4", body: " Lovely card.\r\nThe colours are even better in real life. ", name: " Ada L. " };

describe("parseReview", () => {
  it("reads the piece, a rating of one to five stars, the words and the name shown, tidied", () => {
    expect(parseReview(form(good))).toEqual({
      ok: true,
      data: { productId: "p1", rating: 4, body: "Lovely card.\nThe colours are even better in real life.", name: "Ada L." },
    });
  });

  it("takes every whole number of stars from one to five", () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(parseReview(form({ ...good, rating: String(rating) }))).toMatchObject({ ok: true, data: { rating } });
    }
  });

  // The radios offer only one to five, but the action takes whatever a request sends.
  it("refuses a rating that no star stands for", () => {
    for (const rating of ["", "0", "6", "4.5", "-1", "five", "1e0"]) {
      expect(parseReview(form({ ...good, rating }))).toEqual({ ok: false, errors: { rating: "Please choose how many stars to give it." } });
    }
  });

  it("asks for the words and a name when they are missing", () => {
    expect(parseReview(form({ ...good, body: " ", name: "" }))).toEqual({
      ok: false,
      errors: { body: "Please write a few words about it.", name: "Please give a name to show with your review." },
    });
  });

  it("keeps the review to 2,000 characters and the name to 50", () => {
    expect([BODY_MAX, NAME_MAX]).toEqual([2000, 50]);
    expect(parseReview(form({ ...good, body: "x".repeat(2001), name: "x".repeat(51) }))).toEqual({
      ok: false,
      errors: { body: "Please keep your review to 2,000 characters.", name: "Please keep the name to 50 characters." },
    });
    expect(parseReview(form({ ...good, body: "x".repeat(2000), name: "x".repeat(50) })).ok).toBe(true);
  });

  it("needs to know which piece it is about", () => {
    expect(parseReview(form({ ...good, productId: "" }))).toEqual({ ok: false, errors: {} });
  });
});

describe("shownName", () => {
  // A review is public, so it starts from the first name and an initial, not
  // the whole name on the account; the shopper can change it.
  it("offers the first name and the initial of the last", () => {
    expect(shownName("Ada Lovelace")).toBe("Ada L.");
    expect(shownName("  Ada   King  Lovelace ")).toBe("Ada L.");
  });

  it("offers a single name as it is", () => {
    expect(shownName("Ada")).toBe("Ada");
  });

  it("offers nothing when the account has no name", () => {
    expect(shownName(null)).toBe("");
    expect(shownName("  ")).toBe("");
  });
});

describe("parseReply", () => {
  it("reads the shop's reply, tidied", () => {
    expect(parseReply(form({ id: "r1", reply: " Thank you, Ada!\r\n " }))).toEqual({ ok: true, data: { id: "r1", reply: "Thank you, Ada!" } });
  });

  it("takes an empty reply as taking the reply away", () => {
    expect(parseReply(form({ id: "r1", reply: "  " }))).toEqual({ ok: true, data: { id: "r1", reply: null } });
  });

  it("keeps a reply to 2,000 characters", () => {
    expect(REPLY_MAX).toBe(2000);
    expect(parseReply(form({ id: "r1", reply: "x".repeat(2001) }))).toEqual({ ok: false, error: "Please keep the reply to 2,000 characters." });
  });
});
