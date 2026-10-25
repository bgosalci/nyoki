"use client";

import { ShopField, shopInputClass } from "@/components/shop/field";
import { ui } from "@/lib/brand/ui";
import { useActionForm } from "@/lib/forms/action-form";
import { HONEYPOT, MESSAGE_MAX, NAME_MAX, type QuestionErrors } from "@/lib/questions/validate";

export interface QuestionState {
  errors: QuestionErrors;
  /** Why nothing was kept, when it is nothing the shopper typed: too many questions too fast. */
  notice?: string;
  /** Set once the question is kept. */
  sent?: { name: string };
}

export type QuestionAction = (state: QuestionState, formData: FormData) => Promise<QuestionState>;

/** Where a piece's page keeps its Ask a question section, for links to open it. */
export const ASK_ID = "ask-a-question";

const EMPTY: QuestionState = { errors: {} };

/**
 * Ask a question: on a piece's page, about that piece, and on the Contact
 * page, about anything. Answered by email, from the admin's Questions list.
 *
 * The action is a prop, so the form renders in tests without a server.
 * What was typed is kept when something is wrong (`useActionForm`); once
 * the question is sent, a thank-you takes the form's place.
 */
export function QuestionForm({
  action,
  productId,
  shopper,
}: {
  action: QuestionAction;
  /** The piece asked about; none on the Contact page. */
  productId?: string;
  /** A signed-in shopper, whose name and email need not be typed again. */
  shopper?: { name: string | null; email: string };
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(
    action,
    EMPTY,
    (result) => !result.sent,
  );
  const { errors } = state;

  if (state.sent) {
    return (
      <p role="status" className={`rounded border px-4 py-3 text-sm leading-relaxed ${ui.shopRule} ${ui.shopSurface}`}>
        Thank you{state.sent.name ? `, ${state.sent.name}` : ""}. We will reply by email as soon as we can.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {state.notice ? (
        <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.notice}
        </p>
      ) : null}

      {productId ? <input type="hidden" name="productId" value={productId} /> : null}

      <ShopField label="Your name" name="name" error={errors.name}>
        {(props) => (
          <input
            {...props}
            type="text"
            autoComplete="name"
            maxLength={NAME_MAX}
            defaultValue={shopper?.name ?? ""}
            className={shopInputClass}
          />
        )}
      </ShopField>

      <ShopField label="Your email" name="email" error={errors.email} hint="Only to reply to you.">
        {(props) => (
          <input {...props} type="email" autoComplete="email" defaultValue={shopper?.email ?? ""} className={shopInputClass} />
        )}
      </ShopField>

      <ShopField label="Your question" name="message" error={errors.message}>
        {(props) => <textarea {...props} rows={5} maxLength={MESSAGE_MAX} className={`${shopInputClass} resize-y`} />}
      </ShopField>

      {/* Off the screen and out of reach of the keyboard and screen readers:
          only a bot, filling in every box it finds, puts anything here. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`self-start px-6 py-3 text-xs tracking-[0.14em] uppercase disabled:opacity-60 ${ui.shopButton}`}
      >
        {isPending ? "Sending…" : "Send question"}
      </button>
    </form>
  );
}

/**
 * A link to a piece's Ask a question section that opens it on the way: the
 * section is a closed disclosure, and not every browser opens one it is
 * sent to.
 */
export function AskLink({ children }: { children: React.ReactNode }) {
  return (
    <a
      href={`#${ASK_ID}`}
      onClick={() => {
        const section = document.getElementById(ASK_ID);
        if (section instanceof HTMLDetailsElement) section.open = true;
      }}
      className="underline underline-offset-4"
    >
      {children}
    </a>
  );
}
