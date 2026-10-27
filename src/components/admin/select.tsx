"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";

/**
 * A select whose value React holds, which a form reset leaves as it is.
 *
 * React 19 resets a form after its action returns. A controlled text box
 * survives that, because React keeps its default in step with its value; a
 * controlled select it does not, so the reset drops it to its first option
 * while React still holds the one chosen - nothing re-renders to put it
 * right - and the next save posts the first option. A piece saved as a Large
 * Letter showed "Not set", and saving it again cleared it. This keeps the
 * chosen option the default, as React does for a text box.
 *
 * Every controlled select in a form that stays on the page after it saves
 * is one of these.
 */
export function Select({ value, ...props }: ComponentProps<"select"> & { value: string | number }) {
  const ref = useRef<HTMLSelectElement>(null);

  // After every render, since the options can change as well as the value.
  useLayoutEffect(() => {
    for (const option of ref.current?.options ?? []) option.defaultSelected = option.value === String(value);
  });

  return <select ref={ref} value={value} {...props} />;
}
