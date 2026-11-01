"use server";

import { revalidatePath } from "next/cache";

import type { QuestionState } from "@/components/shop/question-form";
import { db } from "@/lib/db";
import { QUESTIONS_PER_HOUR, isBot, parseQuestion } from "@/lib/questions/validate";
import { EVERYONE, QUESTIONS_IN_ALL, QUESTIONS_PER_ADDRESS, attempt, requestAddress } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;

/**
 * Keeps a shopper's question for the admin's Questions list: from a piece's
 * page, with the piece and its name as it stands, or from the Contact page.
 */
export async function askQuestion(_state: QuestionState, formData: FormData): Promise<QuestionState> {
  const name = formData.get("name");
  // A bot is told it worked, so it learns nothing, and nothing is kept.
  if (isBot(formData)) return { errors: {}, sent: { name: typeof name === "string" ? name.trim() : "" } };

  const parsed = parseQuestion(formData);
  if (!parsed.ok) return { errors: parsed.errors };
  const { productId, ...question } = parsed.data;

  // Five an hour from one email, five from one address whatever email it
  // gives, and a ceiling for everyone together. Only questions kept count:
  // one turned away is taken back off, so a flood cannot hold the ceiling
  // shut with the very requests it was turned away for.
  const address = await requestAddress();
  const [recent, fromHere, inAll] = await Promise.all([
    db.question.count({ where: { email: question.email, createdAt: { gte: new Date(Date.now() - HOUR) } } }),
    attempt(QUESTIONS_PER_ADDRESS, address),
    attempt(QUESTIONS_IN_ALL, EVERYONE),
  ]);
  if (recent >= QUESTIONS_PER_HOUR || fromHere.over || inAll.over) {
    await Promise.all([fromHere.forget(), inAll.forget()]);
    // The email's five are the shopper's own. The address can be a whole
    // office's, and the ceiling is everyone's: that answer blames nobody.
    return recent >= QUESTIONS_PER_HOUR
      ? { errors: {}, notice: "You have sent several questions in the last hour. Please wait a little before sending another." }
      : { errors: {}, notice: "We can't take another question just now. Please try again a little later." };
  }

  // A piece taken off the shop since the page was opened is not one a
  // shopper could have been looking at; the question is kept without it.
  const product = productId
    ? await db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true, name: true } })
    : null;

  await db.question.create({ data: { ...question, productId: product?.id ?? null, productName: product?.name ?? null } });

  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  return { errors: {}, sent: { name: question.name } };
}
