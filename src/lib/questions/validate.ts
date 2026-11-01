import { normaliseEmail } from "@/lib/auth/authenticate";
import { looksLikeEmail } from "@/lib/email";

/**
 * A shopper's question, as the Ask a question form posts it.
 *
 * Pure, so the rules are tested apart from the page. The email is the one
 * thing the answer depends on, so it is checked to look like one; nothing
 * tries to prove it can receive mail.
 */

export const NAME_MAX = 100;
export const MESSAGE_MAX = 2000;

/**
 * A box hidden from everyone but a bot, which fills in every box it finds. A
 * question with anything in it is a bot's, and is quietly not kept. A puzzle
 * to solve would stop bots too, and the shoppers with them.
 */
export const HONEYPOT = "website";

/** How many questions one address may send in an hour, before being asked to wait. */
export const QUESTIONS_PER_HOUR = 5;

export interface QuestionInput {
  name: string;
  email: string;
  message: string;
  /** The piece asked about; null from the Contact page. */
  productId: string | null;
}

export type QuestionField = "name" | "email" | "message";
export type QuestionErrors = Partial<Record<QuestionField, string>>;

export type QuestionValidation = { ok: true; data: QuestionInput } | { ok: false; errors: QuestionErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  // A textarea submits its line breaks as \r\n; keep plain \n.
  return typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
}

export function parseQuestion(form: FormData): QuestionValidation {
  const errors: QuestionErrors = {};

  const name = text(form, "name");
  if (name === "") errors.name = "Please tell us your name.";
  else if (name.length > NAME_MAX) errors.name = `Please keep your name to ${NAME_MAX} characters.`;

  const email = normaliseEmail(text(form, "email"));
  if (email === "") errors.email = "Please give the email address we should reply to.";
  else if (!looksLikeEmail(email)) errors.email = "That does not look like an email address.";

  const message = text(form, "message");
  if (message === "") errors.message = "Please write your question.";
  else if (message.length > MESSAGE_MAX) errors.message = `Please keep your question to ${MESSAGE_MAX.toLocaleString("en-GB")} characters.`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, message, productId: text(form, "productId") || null } };
}

/** Whether a bot sent it: the hidden box has something in it. */
export function isBot(form: FormData): boolean {
  return text(form, HONEYPOT) !== "";
}
