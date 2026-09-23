"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore } from "react";

import { BackLink } from "@/components/admin/back-link";
import { ui } from "@/lib/brand/ui";
import {
  parseProductList,
  readProductList,
  rememberProductList,
  stepsFor,
  subscribeToProductList,
  tabSuffix,
  type ListedProduct,
  type ProductList,
} from "@/lib/products/browse";

/** The server cannot see this tab's list, so it renders the whole one. */
const getServerSnapshot = () => null;

const stepClass = `inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${ui.buttonSecondary}`;

function Step({
  label,
  item,
  href,
  arrow,
}: {
  label: "Previous" | "Next";
  item: ListedProduct | null;
  href: string;
  arrow: "before" | "after";
}) {
  const content = (
    <>
      {arrow === "before" ? <span aria-hidden="true">←</span> : null}
      {label}
      {arrow === "after" ? <span aria-hidden="true">→</span> : null}
    </>
  );

  // Kept in place, greyed, at either end: a button that vanishes moves the
  // other one out from under the pointer.
  if (!item) {
    return (
      <span aria-hidden="true" className={`${stepClass} pointer-events-none opacity-40`}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={`${label}: ${item.name}`} title={item.name} className={stepClass}>
      {content}
    </Link>
  );
}

/**
 * The way back to the list, and the way on to the pieces either side of this
 * one in it - on the same tab, so pricing one piece after another never goes
 * through the list.
 *
 * The list is the one this piece was opened from, when it was; otherwise the
 * whole list in its usual order, which the server sends as `fallback`.
 */
export function ProductSteps({ productId, fallback }: { productId: string; fallback: ProductList }) {
  const raw = useSyncExternalStore(subscribeToProductList, readProductList, getServerSnapshot);
  const remembered = useMemo(() => parseProductList(raw), [raw]);
  const list = stepsFor(remembered, productId) ? remembered : fallback;
  const pathname = usePathname();

  // Falling back, remember the whole list as it stands now: saving this piece
  // moves it to the top of the list the server sends next, and stepping must
  // keep going the way it started. Storage is read afresh rather than taken
  // from the render, which during hydration is the server's - to trust it
  // would overwrite the list this piece really came from.
  useEffect(() => {
    if (!stepsFor(parseProductList(readProductList()), productId)) rememberProductList(fallback);
  }, [productId, fallback]);

  const steps = stepsFor(list, productId);
  const tab = tabSuffix(pathname, productId);
  const hrefFor = (item: ListedProduct | null) => (item ? `/admin/products/${item.id}${tab}` : "");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Back to the list as it was filtered - but only if this piece came from it. */}
      <BackLink href={steps && list ? list.href : "/admin/products"}>Back to all products</BackLink>

      {steps ? (
        <nav aria-label="Other products" className="flex items-center gap-2">
          <p className={`mr-1 text-sm tabular-nums ${ui.mutedOnPage}`}>
            {steps.position} of {steps.total}
          </p>
          <Step label="Previous" item={steps.previous} href={hrefFor(steps.previous)} arrow="before" />
          <Step label="Next" item={steps.next} href={hrefFor(steps.next)} arrow="after" />
        </nav>
      ) : null}
    </div>
  );
}
