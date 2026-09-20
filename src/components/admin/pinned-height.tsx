"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * A block that publishes its rendered height to its parent as
 * `--pinned-height`, re-measured whenever it resizes.
 *
 * A sticky table header needs a `top` offset equal to everything pinned above
 * it, and a list's title-and-filter block changes height as its controls wrap.
 * CSS cannot measure that, so this does.
 */
export function PinnedHeight({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const publish = () => {
      element.parentElement?.style.setProperty("--pinned-height", `${element.offsetHeight}px`);
    };

    publish();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(publish);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
