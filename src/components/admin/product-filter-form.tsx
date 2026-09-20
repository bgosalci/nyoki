"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { inputClass } from "@/components/admin/field";
import { filterHref } from "@/lib/products/filter-href";
import { ui } from "@/lib/brand/ui";

/** How long to wait after the last keystroke before searching. */
const PAUSE_MS = 250;


/**
 * Live filtering for the products list. The state lives in the URL, so the
 * server component re-renders with the results and a filtered view can still
 * be bookmarked. Typing waits for a pause; a status change or Enter applies
 * straight away.
 */
/** The chosen category is carried through untouched; the pills own changing it. */
export function ProductFilterForm({ initialQ, initialStatus, category }: { initialQ: string; initialStatus: string; category: string }) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(initialQ);
  const [status, setStatus] = useState(initialStatus);
  const skipFirst = useRef(true);

  const apply = (next: { q: string; status: string }) => {
    router.replace(filterHref(pathname, { ...next, category }), { scroll: false });
  };

  useEffect(() => {
    // The initial values came from the URL; re-applying them would be a no-op navigation.
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const timer = setTimeout(() => apply({ q, status }), PAUSE_MS);
    return () => clearTimeout(timer);
    // status changes apply on their own below; this effect is for typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtering = q.length > 0 || status.length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply({ q, status });
      }}
      className="mt-6 flex flex-wrap items-end gap-3"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="product-search" className="text-sm font-medium">
          Find
        </label>
        <input
          id="product-search"
          name="q"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Name or product code"
          autoComplete="off"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="product-status" className="text-sm font-medium">
          Status
        </label>
        <select
          id="product-status"
          name="status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            apply({ q, status: event.target.value });
          }}
          className={inputClass}
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>
      {filtering ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setStatus("");
            apply({ q: "", status: "" });
          }}
          className={`pb-2 text-sm ${ui.link}`}
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}
