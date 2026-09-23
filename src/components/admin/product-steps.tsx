"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";

import { BackLink } from "@/components/admin/back-link";
import { ui } from "@/lib/brand/ui";
import { parseProductList, readProductList, stepsFor, tabSuffix, type ListedProduct } from "@/lib/products/browse";

// The list is written by the products page, never while this one is open, so
// there is nothing to listen for.
const subscribe = () => () => {};

/** The server cannot see this tab's list, so it renders the way back alone. */
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
 */
export function ProductSteps({ productId }: { productId: string }) {
  const raw = useSyncExternalStore(subscribe, readProductList, getServerSnapshot);
  const list = useMemo(() => parseProductList(raw), [raw]);
  const pathname = usePathname();

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
