import { matchesEveryWord } from "@/lib/search";

describe("matchesEveryWord", () => {
  it("matches when every word typed is there, in any order and any case", () => {
    expect(matchesEveryWord("Snowflake Card Cards › Christmas Cards", "christmas snow")).toBe(true);
    expect(matchesEveryWord("Snowflake Card Cards › Christmas Cards", "CARD")).toBe(true);
  });

  it("does not match when any word is missing", () => {
    expect(matchesEveryWord("Snowflake Card Cards › Christmas Cards", "christmas vase")).toBe(false);
  });

  it("matches everything when nothing is typed", () => {
    expect(matchesEveryWord("anything", "   ")).toBe(true);
  });
});
