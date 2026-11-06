import { EMAIL_MAX, EMAIL_PATTERN, looksLikeEmail } from "@/lib/email";

import { QUICK_MS, fastestRun } from "./helpers/fastest-run";

describe("looksLikeEmail", () => {
  it.each(["jo@example.com", "jo.bloggs+cards@mail.example.co.uk", "o'brien@example.ie", "a@b.co"])("takes %s", (email) => {
    expect(looksLikeEmail(email)).toBe(true);
  });

  it.each([
    ["no at sign", "jo.example.com"],
    ["no dot after the at", "jo@example"],
    ["two at signs", "jo@x@example.com"],
    ["a space", "jo bloggs@example.com"],
    ["an empty label", "jo@example..com"],
    ["a trailing dot", "jo@example.com."],
    ["nothing before the at", "@example.com"],
  ])("refuses %s", (_, email) => {
    expect(looksLikeEmail(email)).toBe(false);
  });

  // An address is pasted into the admin's "Reply by email" link, where these
  // would start a query (?cc=, &body=), escape one (%), or list a second
  // recipient (, ;) - extras Njomza never meant to write to.
  it.each(["?", "&", "%", ",", ";", "<", ">", '"'])("refuses an address holding %s", (character) => {
    expect(looksLikeEmail(`jo${character}x@example.com`)).toBe(false);
  });

  it("refuses anything longer than an address can be", () => {
    const local = "a".repeat(64);
    const longest = `${local}@${"b".repeat(EMAIL_MAX - local.length - 5)}.com`;
    expect(longest).toHaveLength(EMAIL_MAX);
    expect(looksLikeEmail(longest)).toBe(true);
    expect(looksLikeEmail(`a${longest}`)).toBe(false);
  });

  // The pattern this replaced, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, could split a run
  // of dots between its last two parts in every possible way: 80,000 dots
  // took three seconds through the Contact form, four times as long for every
  // doubling, and the form accepts eleven megabytes.
  it("answers a long crafted input at once", () => {
    const crafted = `a@${".".repeat(100_000)}@`;
    expect(fastestRun(() => looksLikeEmail(crafted))).toBeLessThan(QUICK_MS);
    expect(looksLikeEmail(crafted)).toBe(false);
  });

  it.each([
    ["dots", `a@${".".repeat(200_000)}@`],
    ["labels", `a@${"b.".repeat(100_000)}@`],
    ["a long local part", `${"a".repeat(200_000)}`],
    ["at signs", `${"a@".repeat(100_000)}`],
  ])("matches in a single pass even uncapped: %s", (_, crafted) => {
    expect(fastestRun(() => EMAIL_PATTERN.test(crafted))).toBeLessThan(QUICK_MS);
  });
});
