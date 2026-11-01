import { replyLink } from "@/lib/questions/reply";

const asked = {
  name: "Ada",
  email: "ada@example.com",
  message: "Do you have it in 5-6 years?\nThanks",
  productName: "Girl’s Coat",
  createdAt: new Date("2026-10-20T10:00:00Z"),
};

describe("replyLink", () => {
  it("opens a reply to the shopper about the piece, their question quoted beneath", () => {
    const url = new URL(replyLink(asked));

    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("ada@example.com");
    expect(url.searchParams.get("subject")).toBe("Your question about Girl’s Coat");
    expect(url.searchParams.get("body")).toBe("Hello Ada,\r\n\r\n\r\n\r\nOn 20 Oct 2026 you wrote:\r\n> Do you have it in 5-6 years?\r\n> Thanks");
  });

  it("names the shop for a question sent from the Contact page", () => {
    const url = new URL(replyLink({ ...asked, productName: null }));

    expect(url.searchParams.get("subject")).toBe("Your question to Nyoki Handmade");
  });

  it("keeps the link short enough for any mail program by quoting only the start of a long question", () => {
    const body = new URL(replyLink({ ...asked, message: "word ".repeat(600) })).searchParams.get("body")!;

    expect(body.length).toBeLessThan(1700);
    expect(body.endsWith("…")).toBe(true);
  });
});

describe("replyLink with an address the form would now refuse", () => {
  // Questions sent before the address check tightened keep what they were
  // sent with: a ? or & in one must not add a recipient or replace the body.
  it("keeps the whole address as the one recipient, and the body as ours", () => {
    const url = new URL(replyLink({ ...asked, email: "me@x.co?cc=third@party.com&body=Pay%20here" }));

    expect(url.searchParams.get("cc")).toBeNull();
    expect(url.searchParams.get("body")).toMatch(/^Hello Ada,/);
    expect(decodeURIComponent(url.pathname)).toBe("me@x.co?cc=third@party.com&body=Pay%20here");
  });

  it("still writes the @ as it is", () => {
    expect(replyLink(asked)).toMatch(/^mailto:ada@example\.com\?/);
  });
});

describe("replyLink with a plus in the address", () => {
  // Encoded whole, jo+shop@ became jo%2Bshop@ - and a mail program that does
  // not decode the address, as some do not decode an @, would write to the
  // wrong one. Only what could change who it goes to, or what it says, is.
  it("writes the plus as it is", () => {
    expect(replyLink({ ...asked, email: "jo+shop@example.com" })).toMatch(/^mailto:jo\+shop@example\.com\?/);
  });
});
