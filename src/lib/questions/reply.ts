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

  // The address goes in as it is: an email that passed the form has no
  // spaces, and an encoded @ is not understood by every mail program.
  return `mailto:${question.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
