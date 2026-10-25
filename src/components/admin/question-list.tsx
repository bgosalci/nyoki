"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ui } from "@/lib/brand/ui";
import { formatOrderDate } from "@/lib/orders/status";
import { replyLink } from "@/lib/questions/reply";

export interface QuestionRow {
  id: string;
  name: string;
  email: string;
  message: string;
  productId: string | null;
  /** The piece's name when it was asked; kept if the piece is deleted. */
  productName: string | null;
  createdAt: Date;
  answeredAt: Date | null;
}

type FormAction = (formData: FormData) => Promise<void>;

/**
 * Shoppers' questions, each with who asked, when, about which piece, and what
 * they asked. Answered from the admin's own mail program - Reply by email
 * opens a reply already addressed, titled and quoting the question - then
 * marked answered. Deleting asks first, since it cannot be undone.
 */
export function QuestionList({ questions, setAnswered, remove }: { questions: QuestionRow[]; setAnswered: FormAction; remove: FormAction }) {
  return (
    <ul className="flex flex-col gap-3">
      {questions.map((question) => (
        <li key={question.id}>
          <QuestionCard question={question} setAnswered={setAnswered} remove={remove} />
        </li>
      ))}
    </ul>
  );
}

function QuestionCard({ question, setAnswered, remove }: { question: QuestionRow; setAnswered: FormAction; remove: FormAction }) {
  const nameId = useId();
  const deleteForm = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  const answered = question.answeredAt !== null;

  return (
    <article aria-labelledby={nameId} className={`rounded-lg border p-5 ${ui.card} ${ui.rule}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span id={nameId} className="font-medium">
            {question.name}
          </span>
          <span className={`text-sm ${ui.mutedOnPanel}`}>{question.email}</span>
        </p>
        <p className={`text-sm ${ui.mutedOnPanel}`}>
          {formatOrderDate(question.createdAt)}
          {question.answeredAt ? ` · Answered ${formatOrderDate(question.answeredAt)}` : null}
        </p>
      </div>

      <p className={`mt-1 text-sm ${ui.mutedOnPanel}`}>
        {question.productId && question.productName ? (
          <>
            About{" "}
            <Link href={`/admin/products/${question.productId}`} className={ui.link}>
              {question.productName}
            </Link>
          </>
        ) : question.productName ? (
          `About ${question.productName} (no longer in the shop)`
        ) : (
          "From the Contact page"
        )}
      </p>

      <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{question.message}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a href={replyLink(question)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${ui.buttonPrimary}`}>
          Reply by email
        </a>

        <form action={setAnswered}>
          <input type="hidden" name="id" value={question.id} />
          <input type="hidden" name="answered" value={answered ? "false" : "true"} />
          <button type="submit" className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
            {answered ? "Mark as waiting" : "Mark answered"}
          </button>
        </form>

        <form ref={deleteForm} action={remove}>
          <input type="hidden" name="id" value={question.id} />
          <button type="button" onClick={() => setConfirming(true)} className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
            Delete
          </button>
        </form>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this question?"
        description={`${question.name}'s question and email address go for good. Keep anything you still need in your email first.`}
        confirmLabel="Delete question"
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
        onCancel={() => setConfirming(false)}
      />
    </article>
  );
}
