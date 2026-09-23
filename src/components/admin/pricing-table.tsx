"use client";

import Link from "next/link";
import { useState } from "react";

import { BulkPriceDialog } from "@/components/admin/bulk-price-dialog";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import type { PricingRow } from "@/lib/costing/list";
import { formatPence } from "@/lib/money";
import type { RepriceFields } from "@/lib/products/repricing";

const LOSS = "text-red-600 dark:text-red-400";

/**
 * Every piece's cost, price and profit, and the one place a price is changed
 * in bulk.
 *
 * A piece not yet costed says so rather than showing a profit: without its
 * costs, the whole price after VAT would read as profit, which is a
 * flattering figure that means nothing.
 */
export function PricingTable({
  rows,
  header,
  reprice,
}: {
  rows: PricingRow[];
  header: React.ReactNode;
  reprice: (ids: string[], fields: RepriceFields) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pricing, setPricing] = useState(false);

  const chosen = rows.filter((row) => selected.has(row.id));
  const allChosen = rows.length > 0 && chosen.length === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        {header}

        {chosen.length > 0 ? (
          <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-md border p-3 ${ui.card} ${ui.ruleOnPage}`}>
            <p className="text-sm font-medium">{chosen.length} selected</p>
            <button type="button" onClick={() => setPricing(true)} className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
              Change price
            </button>
          </div>
        ) : null}
      </PinnedHeight>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <Th>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allChosen}
                onChange={() => setSelected(allChosen ? new Set() : new Set(rows.map((row) => row.id)))}
                className={`size-4 align-middle ${ui.checkbox}`}
              />
            </Th>
            <Th srOnly>Photo</Th>
            <Th>Name</Th>
            <Th align="right">Cost</Th>
            <Th align="right">Price</Th>
            <Th align="right">Profit</Th>
            <Th align="right">On cost</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={`border-b ${ui.tableRow}`}>
              <td className="py-2 pr-4">
                <input
                  type="checkbox"
                  aria-label={row.name}
                  checked={selected.has(row.id)}
                  onChange={() => toggle(row.id)}
                  className={`size-4 align-middle ${ui.checkbox}`}
                />
              </td>
              <td className="py-2 pr-3">
                <ProductThumbnail image={row.image} />
              </td>
              <td className="py-2 pr-4">
                <Link href={`/admin/pricing/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                  {row.name}
                </Link>
              </td>
              <td className={`py-2 pr-4 text-right tabular-nums ${row.costed ? "" : ui.mutedOnPage}`}>
                {row.costed ? formatPence(row.costPence) : "Not costed"}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{formatPence(row.pricePence)}</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {row.profitPence === null ? (
                  <span className={ui.mutedOnPage}>—</span>
                ) : (
                  <span className={row.profitPence < 0 ? LOSS : ""}>{formatPence(row.profitPence)}</span>
                )}
              </td>
              <td className={`py-2 pr-4 text-right tabular-nums ${ui.mutedOnPage}`}>
                {row.costMultiple === null ? "—" : `×${row.costMultiple.toFixed(2)}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <BulkPriceDialog
        open={pricing}
        rows={chosen.map((row) => ({ id: row.id, name: row.name, pricePence: row.pricePence }))}
        onCancel={() => setPricing(false)}
        onApply={async (fields) => {
          setPricing(false);
          await reprice(chosen.map((row) => row.id), fields);
          setSelected(new Set());
        }}
      />
    </>
  );
}
