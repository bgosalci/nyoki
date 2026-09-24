import { useActionState, useLayoutEffect, useRef, type FormEvent } from "react";

import { restoreFormValues } from "@/lib/forms/restore";

/**
 * useActionState for a form of uncontrolled fields, which keeps what was
 * typed when the save is rejected.
 *
 * React 19 resets a form after its action returns, whatever it returned: a
 * validation error puts every field back to what was last saved, and on a
 * new product wipes the lot. The reset is kept - after a save that went
 * through it is what shows the server's tidied values, a web address built
 * from the name - and undone for a rejected one: React resets during the
 * commit that brings the result, and a layout effect runs after that and
 * before the page is painted, so nothing flickers.
 *
 * What was submitted is read in onSubmit, which runs before the action,
 * rather than by wrapping the action: a server action passed straight to the
 * form still works before the page's JavaScript has loaded.
 *
 * Usage: `<form ref={formRef} action={formAction} onSubmit={onSubmit}>`.
 */
export function useActionForm<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
  rejected: (state: Awaited<State>) => boolean,
) {
  const [state, formAction, isPending] = useActionState<State, FormData>(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef<FormData | null>(null);

  const restore = state !== initialState && rejected(state);

  useLayoutEffect(() => {
    const form = formRef.current;
    if (restore && form && submitted.current) restoreFormValues(form, submitted.current);
  }, [state, restore]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    submitted.current = new FormData(event.currentTarget);
  }

  return { state, formAction, isPending, formRef, onSubmit };
}
