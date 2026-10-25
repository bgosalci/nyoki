"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const idOf = (formData: FormData) => {
  const id = formData.get("id");
  return typeof id === "string" ? id : "";
};

function refresh() {
  revalidatePath("/admin/questions");
  // The Overview counts what waits.
  revalidatePath("/admin");
}

/** Marked answered (with when), or put back to waiting. */
export async function setQuestionAnswered(formData: FormData): Promise<void> {
  await requireAdmin();
  const answered = formData.get("answered") === "true";
  await db.question.update({ where: { id: idOf(formData) }, data: { answeredAt: answered ? new Date() : null } });
  refresh();
}

/** Gone for good: each question holds a shopper's email address. */
export async function deleteQuestion(formData: FormData): Promise<void> {
  await requireAdmin();
  // deleteMany does not mind one deleted already, in another tab.
  await db.question.deleteMany({ where: { id: idOf(formData) } });
  refresh();
}
