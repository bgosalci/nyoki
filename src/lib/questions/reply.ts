import { formatOrderDate } from "@/lib/orders/status";

/**
 * A link that opens a reply to a shopper's question in the admin's own mail
 * program: addressed, titled, and with the question quoted beneath. The shop
 * sends no email itself yet, so this is how a question is answered.
 */

/** Long links fail in some mail programs; a long question is quoted only so far. */
const QUOTE_MAX = 1200;

export function replyLink(question: { name: string; email: string; message: string; productName: string | null; createdAt: Date }): string {
  const subject = question.productName ? `Your question about ${question.productName}` : "Your question to Nyoki Handmade";

  const quoted = question.message.length > QUOTE_MAX ? `${question.message.slice(0, QUOTE_MAX).trimEnd()}…` : question.message;
  // Mail links break lines with CRLF; the reply goes above the quote.
  const body = [
    `Hello ${question.name},`,
    "",
    "",
    "",
    `On ${formatOrderDate(question.createdAt)} you wrote:`,
    ...quoted.split("\n").map((line) => `> ${line}`),
  ].join("\r\n");

  // Everything in the address is encoded but its @, which not every mail
  // program understands encoded. A question sent before the form refused ?
  // and & keeps the address it came with, and written as it is, one ending
  // "?cc=someone&body=..." would add a recipient and replace this body.
  const to = encodeURIComponent(question.email).replace(/%40/g, "@");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
