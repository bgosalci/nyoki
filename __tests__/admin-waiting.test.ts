import { questionArrival, reviewArrival, waitingSummary } from "@/lib/admin/waiting";

describe("questionArrival", () => {
  it("names who asked, and about which piece", () => {
    expect(questionArrival(1, { name: "Ada", productName: "Girl’s Coat" })).toBe("New question from Ada about Girl’s Coat");
    expect(questionArrival(1, { name: "Ada", productName: null })).toBe("New question from Ada");
  });

  it("counts several that arrived together", () => {
    expect(questionArrival(3, { name: "Ada", productName: null })).toBe("3 new questions");
  });
});

describe("reviewArrival", () => {
  it("names the piece and who reviewed it", () => {
    expect(reviewArrival(1, { name: "Ada L.", productName: "Robin Card", changed: false })).toBe("New review of Robin Card from Ada L.");
  });

  // A changed review goes back to wait for approval, so it is heard about too.
  it("says when a review waiting again was changed rather than new", () => {
    expect(reviewArrival(1, { name: "Ada L.", productName: "Robin Card", changed: true })).toBe("Changed review of Robin Card from Ada L.");
  });

  it("counts several that arrived together", () => {
    expect(reviewArrival(2, { name: "Ada L.", productName: "Robin Card", changed: false })).toBe("2 reviews to read");
  });
});

describe("waitingSummary", () => {
  it("says what waits, whole, for the phone's Menu button", () => {
    expect(waitingSummary({ questions: 3, reviews: 0 })).toBe("3 questions waiting");
    expect(waitingSummary({ questions: 1, reviews: 0 })).toBe("1 question waiting");
    expect(waitingSummary({ questions: 0, reviews: 1 })).toBe("1 review waiting");
    expect(waitingSummary({ questions: 2, reviews: 4 })).toBe("2 questions and 4 reviews waiting");
  });

  it("says nothing when nothing waits", () => {
    expect(waitingSummary({ questions: 0, reviews: 0 })).toBeNull();
  });
});
