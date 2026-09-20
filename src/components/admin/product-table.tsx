"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkPriceDialog } from "@/components/admin/bulk-price-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { formatPence } from "@/lib/money";
import type { RepriceFields } from "@/lib/products/repricing";
import type { ProductStatus } from "@/lib/products/validate";

export interface ProductRow {
  id: string;
  name: string;
  status: ProductStatus;
  pricePence: number;
  stock: number;
  madeToOrder: boolean;
  oneOfAKind: boolean;
  image: { url: string; alt: string | null } | null;
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

/**
 * The products list, with a checkbox per row and actions that apply to
 * whatever is chosen.
 *
 * Changing a price in bulk previews itself first: the old prices are kept
 * nowhere, so there is nothing to undo it with.
 *
 * Archiving and deleting are both offered because they are different things:
 * archiving takes a product off the shop and can be undone, deleting removes
 * it for good. Deleting is safe for order history - a line records the name
 * and price it sold at, so an old order still reads correctly afterwards -
 * but it is still permanent, so it asks first.
 */
export function ProductTable({
  rows,
  setStatus,
  remove,
  reprice,
}: {
  rows: ProductRow[];
  setStatus: (ids: string[], status: ProductStatus) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  reprice: (ids: string[], fields: RepriceFields) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pricing, setPricing] = useState(false);

  // Kept in the table's order, so an action reads the same way the list does.
  const chosen = rows.filter((row) => selected.has(row.id)).map((row) => row.id);
  const allChosen = rows.length > 0 && chosen.length === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply(action: () => Promise<void>) {
    await action();
    setSelected(new Set());
  }

  const actionClass = `rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`;

  return (
    <>
      {chosen.length > 0 ? (
        <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-md border p-3 ${ui.card} ${ui.ruleOnPage}`}>
          <p className="text-sm font-medium">{chosen.length} selected</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPricing(true)} className={actionClass}>
              Change price
            </button>
            <button type="button" onClick={() => apply(() => setStatus(chosen, "ACTIVE"))} className={actionClass}>
              Make active
            </button>
            <button type="button" onClick={() => apply(() => setStatus(chosen, "DRAFT"))} className={actionClass}>
              Make draft
            </button>
            <button type="button" onClick={() => apply(() => setStatus(chosen, "ARCHIVED"))} className={actionClass}>
              Archive
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md px-3 py-1.5 text-sm text-red-700 underline underline-offset-4 dark:text-red-300"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChosen}
                  onChange={() => setSelected(allChosen ? new Set() : new Set(rows.map((row) => row.id)))}
                  className="size-4 align-middle"
                />
              </Th>
              <Th srOnly>Photo</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th align="right">Price</Th>
              <Th align="right">Stock</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={`border-b ${ui.tableRow}`}>
                <td className="py-3 pr-4">
                  <input
                    type="checkbox"
                    aria-label={row.name}
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    className="size-4 align-middle"
                  />
                </td>
                <td className="py-2 pr-3">
                  <ProductThumbnail image={row.image} />
                </td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/products/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                    {row.name}
                  </Link>
                  {row.oneOfAKind ? <span className={`ml-2 text-xs ${ui.mutedOnPage}`}>one of a kind</span> : null}
                </td>
                <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>{STATUS_LABEL[row.status]}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{formatPence(row.pricePence)}</td>
                <td className="py-3 pr-4 text-right tabular-nums">{row.madeToOrder ? "made to order" : row.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkPriceDialog
        open={pricing}
        rows={rows.filter((row) => selected.has(row.id))}
        onCancel={() => setPricing(false)}
        onApply={(fields) => {
          setPricing(false);
          return apply(() => reprice(chosen, fields));
        }}
      />

      <ConfirmDialog
        open={confirming}
        title={`Delete ${chosen.length} ${chosen.length === 1 ? "product" : "products"}?`}
        description="Their photos go too. This cannot be undone. Past orders keep the name and price they sold at, so order history is unaffected."
        confirmLabel={`Delete ${chosen.length} ${chosen.length === 1 ? "product" : "products"}`}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void apply(() => remove(chosen));
        }}
      />
    </>
  );
}
