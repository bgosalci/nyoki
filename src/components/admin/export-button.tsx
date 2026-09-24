"use client";

import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ui } from "@/lib/brand/ui";
import { filterHref } from "@/lib/products/filter-href";

/**
 * Exports the products as a CSV file - as the list is filtered, so a file of
 * just the Christmas cards is one click from the Christmas cards.
 *
 * It asks first. The file holds every cost and margin in the shop, and once
 * it is downloaded it lives wherever the browser puts it; confirming names
 * how many products it will hold.
 *
 * The download itself is a hidden link with `download`, clicked once
 * confirmed: the file is served as an attachment, so the page stays put.
 */
export function ExportButton({ q, status, category, count }: { q: string; status: string; category: string; count: number }) {
  const [asking, setAsking] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);

  const filtered = q.length > 0 || status.length > 0 || category.length > 0;
  const products = `${count} ${count === 1 ? "product" : "products"}`;
  const which = filtered ? (count === 1 ? "this" : "these") : "all";

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonSecondary}`}
      >
        Export CSV
      </button>

      <a ref={link} href={filterHref("/admin/products/export", { q, status, category })} download hidden aria-hidden="true" tabIndex={-1} />

      <ConfirmDialog
        open={asking}
        tone="primary"
        title={`Export ${which} ${products}?`}
        description="A spreadsheet file of every product in this list: details, photo links, prices, and your costs and margins. Keep it somewhere private."
        confirmLabel={`Export ${products}`}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false);
          link.current?.click();
        }}
      />
    </>
  );
}
