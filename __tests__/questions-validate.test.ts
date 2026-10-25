import { HONEYPOT, isBot, parseQuestion } from "@/lib/questions/validate";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const good = { name: " Ada Lovelace ", email: " Ada@Example.com ", message: " Do you have the coat in 5-6 years?\r\nThank you " };

describe("parseQuestion", () => {
  it("reads a name, the email to reply to and the question, tidied", () => {
    expect(parseQuestion(form(good))).toEqual({
      ok: true,
      data: { name: "Ada Lovelace", email: "ada@example.com", message: "Do you have the coat in 5-6 years?\nThank you", productId: null },
    });
  });

  it("carries the piece it was asked about", () => {
    expect(parseQuestion(form({ ...good, productId: " p1 " }))).toMatchObject({ ok: true, data: { productId: "p1" } });
  });

  it("asks for each of the three when it is missing", () => {
    expect(parseQuestion(form({ name: " ", email: "", message: "" }))).toEqual({
      ok: false,
      errors: {
        name: "Please tell us your name.",
        email: "Please give the email address we should reply to.",
        message: "Please write your question.",
      },
    });
  });

  it("catches a name typed into the email box", () => {
    expect(parseQuestion(form({ ...good, email: "Ada Lovelace" }))).toEqual({
      ok: false,
      errors: { email: "That does not look like an email address." },
    });
  });

  it("keeps a question to 2,000 characters and a name to 100", () => {
    expect(parseQuestion(form({ ...good, name: "x".repeat(101), message: "x".repeat(2001) }))).toEqual({
      ok: false,
      errors: { name: "Please keep your name to 100 characters.", message: "Please keep your question to 2,000 characters." },
    });
    expect(parseQuestion(form({ ...good, message: "x".repeat(2000) })).ok).toBe(true);
  });
});

describe("isBot", () => {
  it("knows a bot by the hidden box that only a bot fills in", () => {
    expect(isBot(form({ ...good, [HONEYPOT]: "https://spam.example" }))).toBe(true);
    expect(isBot(form({ ...good, [HONEYPOT]: "" }))).toBe(false);
    expect(isBot(form(good))).toBe(false);
  });
});
