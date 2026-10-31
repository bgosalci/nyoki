"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";

/**
 * A checkbox whose tick React holds, which a form reset leaves as it is.
 *
 * React 19 resets a form after its action returns, and a controlled
 * checkbox's default is whatever it showed when it was first drawn - React
 * never moves it on. So after a save every box went back to how the page
 * opened while React still held the ticks as changed, and nothing re-renders
 * to put it right: a product's Cards, taken off and saved, showed ticked
 * again, and the next save would have put it back. This keeps the tick the
 * default, as `Select` does for a select.
 *
 * Every controlled checkbox in a form that stays on the page after it saves
 * is one of these.
 */
export function Checkbox({ checked, ...props }: Omit<ComponentProps<"input">, "type"> & { checked: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (ref.current) ref.current.defaultChecked = checked;
  }, [checked]);

  return <input ref={ref} type="checkbox" checked={checked} {...props} />;
}
