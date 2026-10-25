import { deleteQuestion, setQuestionAnswered } from "@/app/admin/(protected)/questions/actions";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { QuestionList } from "@/components/admin/question-list";
import { PINNED_BLOCK_CLASS } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

/** Answered questions pile up; the page keeps to the most recent. */
const RECENT_ANSWERED = 100;

export default async function QuestionsPage() {
  const [waiting, answered, answeredCount] = await Promise.all([
    db.question.findMany({ where: { answeredAt: null }, orderBy: { createdAt: "desc" } }),
    db.question.findMany({ where: { answeredAt: { not: null } }, orderBy: { answeredAt: "desc" }, take: RECENT_ANSWERED }),
    db.question.count({ where: { answeredAt: { not: null } } }),
  ]);

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        <h1 className="text-xl font-semibold tracking-tight">Questions</h1>
        <p className={`mt-4 max-w-prose text-sm ${ui.mutedOnPage}`}>
          {waiting.length} waiting · {answeredCount} answered. Reply from your own email; the shop sends none yet. Each
          question holds a shopper&apos;s email address, so delete it once you no longer need it.
        </p>
      </PinnedHeight>

      {waiting.length === 0 && answered.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No questions yet. They arrive here from Ask a question on each piece&apos;s page, and from the Contact page.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex max-w-3xl flex-col gap-10">
          <section aria-labelledby="questions-waiting" className="flex flex-col gap-3">
            <h2 id="questions-waiting" className="text-sm font-semibold">
              Waiting
            </h2>
            {waiting.length > 0 ? (
              <QuestionList questions={waiting} setAnswered={setQuestionAnswered} remove={deleteQuestion} />
            ) : (
              <p className={`text-sm ${ui.mutedOnPage}`}>Nothing waiting. Every question has been answered.</p>
            )}
          </section>

          {answered.length > 0 ? (
            <section aria-labelledby="questions-answered" className="flex flex-col gap-3">
              <h2 id="questions-answered" className="text-sm font-semibold">
                Answered
                {answeredCount > RECENT_ANSWERED ? `, the most recent ${RECENT_ANSWERED}` : null}
              </h2>
              <QuestionList questions={answered} setAnswered={setQuestionAnswered} remove={deleteQuestion} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
