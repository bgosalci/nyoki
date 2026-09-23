"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { inputClass } from "@/components/admin/field";
import type { PricingView } from "@/lib/costing/list";

const PAUSE_MS = 250;

function pricingHref(pathname: string, q: string, view: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (view && view !== "all") params.set("view", view);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Live filtering for the pricing list, held in the URL like the products
 * list's, so a view - "everything at a loss" - can be bookmarked.
 */
export function PricingFilterForm({ initialQ, initialView }: { initialQ: string; initialView: PricingView }) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(initialQ);
  const [view, setView] = useState<string>(initialView);
  const skipFirst = useRef(true);

  const apply = (nextQ: string, nextView: string) =>
    router.replace(pricingHref(pathname, nextQ, nextView), { scroll: false });

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const timer = setTimeout(() => apply(q, view), PAUSE_MS);
    return () => clearTimeout(timer);
    // The view applies on its own, below; this is for typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(q, view);
      }}
      className="mt-5 flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <label htmlFor="pricing-q" className="text-sm font-medium">
          Find
        </label>
        <input id="pricing-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pricing-view" className="text-sm font-medium">
          Show
        </label>
        <select
          id="pricing-view"
          value={view}
          onChange={(e) => {
            setView(e.target.value);
            apply(q, e.target.value);
          }}
          className={inputClass}
        >
          <option value="all">Everything</option>
          <option value="uncosted">Not yet costed</option>
          <option value="loss">Selling at a loss</option>
        </select>
      </div>
    </form>
  );
}
