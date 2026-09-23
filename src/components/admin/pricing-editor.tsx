"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import {
  NOTHS_FEE_PERCENT,
  discountLadder,
  lineCostPence,
  nothsBreakdown,
  priceBreakdown,
  productionCostPence,
} from "@/lib/costing/costing";
import type { EntryLine } from "@/lib/costing/import";
import { VAT_RATES, parseQuantityToHundredths, type PricingErrors } from "@/lib/costing/validate";
import { formatPence, parsePoundsToPence } from "@/lib/money";

export interface PricingState {
  errors: PricingErrors;
  saved?: boolean;
}

export type PricingAction = (state: PricingState, formData: FormData) => Promise<PricingState>;

export interface PricedProduct {
  id: string;
  name: string;
  image: { url: string; alt: string | null } | null;
  pricePence: number;
  compareAtPence: number | null;
  vatRate: number;
}

export interface Suggestion {
  id: string;
  source: string;
  note: string | null;
  photoUrl: string | null;
  pricePence: number;
  vatRate: number;
  lines: EntryLine[];
}

interface Row {
  key: number;
  label: string;
  unit: string;
  quantity: string;
}

const VAT_LABEL: Record<number, string> = { 20: "20% - standard", 5: "5% - reduced", 0: "Zero-rated" };

const pounds = (pence: number) => (pence / 100).toFixed(2);
const hundredthsText = (h: number) => (h % 100 === 0 ? String(h / 100) : (h / 100).toFixed(2).replace(/0$/, ""));

let nextKey = 0;
const toRow = (line: EntryLine): Row => ({
  key: nextKey++,
  label: line.label,
  unit: pounds(line.unitPence),
  quantity: hundredthsText(line.quantityHundredths),
});

/** What a row costs as typed so far - nothing, until it can be read. */
function rowCost(row: Row): number {
  const unitPence = parsePoundsToPence(row.unit.length > 0 ? row.unit : "0") ?? 0;
  const quantityHundredths = row.quantity.trim().length > 0 ? (parseQuantityToHundredths(row.quantity) ?? 0) : 100;
  return lineCostPence({ unitPence, quantityHundredths });
}

function Money({ pence, loss = false }: { pence: number; loss?: boolean }) {
  return <dd className={`text-right tabular-nums ${loss && pence < 0 ? "text-red-600 dark:text-red-400" : ""}`}>{formatPence(pence)}</dd>;
}

/**
 * Pricing a piece: what goes into it, what it sells for, and what is left.
 *
 * Every figure is worked out as the form is typed, with the same pure sums the
 * server uses to check it, so what Njomza sees before saving is what is saved.
 * A piece with no costs of its own is offered the rows of her price lists most
 * likely to be it, to be filled in and checked rather than typed again.
 */
export function PricingEditor({
  product,
  lines,
  origin,
  suggestions,
  action,
  initialState = { errors: {} },
}: {
  product: PricedProduct;
  lines: EntryLine[];
  /** The price-list row these costs came from, if any. */
  origin: { source: string; pricePence: number } | null;
  suggestions: Suggestion[];
  action: PricingAction;
  initialState?: PricingState;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const [rows, setRows] = useState<Row[]>(() => lines.map(toRow));
  const [price, setPrice] = useState(pounds(product.pricePence));
  const [vatRate, setVatRate] = useState(String(product.vatRate));
  const [fromEntry, setFromEntry] = useState<Suggestion | null>(null);

  const costPence = productionCostPence(rows.map((row) => ({ unitPence: rowCost(row), quantityHundredths: 100 })));
  const input = { pricePence: parsePoundsToPence(price) ?? 0, costPence, vatRate: Number(vatRate) };
  const breakdown = priceBreakdown(input);
  const noths = nothsBreakdown(input);
  const ladder = discountLadder(input);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function adopt(suggestion: Suggestion) {
    setRows(suggestion.lines.map(toRow));
    setVatRate(String(suggestion.vatRate));
    setFromEntry(suggestion);
  }

  const lineInput = `w-full rounded-md border px-2 py-1.5 text-sm outline-none ${ui.input}`;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-10">
      <input type="hidden" name="fromEntry" value={fromEntry?.id ?? ""} />

      {state.saved ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. The shop charges the new price now.
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="text-base font-semibold">What it costs</h2>

          {fromEntry ? (
            <p className={`mt-2 text-sm ${ui.mutedOnPage}`}>
              Filled in from <strong>{fromEntry.source}</strong>. Not saved yet - check them first.
            </p>
          ) : origin ? (
            <p className={`mt-2 text-sm ${ui.mutedOnPage}`}>
              Brought in from <strong>{origin.source}</strong>, where it was priced at {formatPence(origin.pricePence)}.
            </p>
          ) : null}

          <table className="mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className={`border-b text-left ${ui.tableHead}`}>
                <th className="py-2 pr-2 font-medium">What</th>
                <th className="w-28 py-2 pr-2 font-medium">Cost each</th>
                <th className="w-20 py-2 pr-2 font-medium">How many</th>
                <th className="w-24 py-2 pr-2 text-right font-medium">Cost</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={`border-b ${ui.tableRow}`}>
                  <td className="py-1.5 pr-2">
                    <input aria-label="What" name="lineLabel" value={row.label} onChange={(e) => update(row.key, { label: e.target.value })} className={lineInput} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input aria-label="Cost each" name="lineUnit" inputMode="decimal" value={row.unit} onChange={(e) => update(row.key, { unit: e.target.value })} className={lineInput} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input aria-label="How many" name="lineQuantity" inputMode="decimal" value={row.quantity} onChange={(e) => update(row.key, { quantity: e.target.value })} className={lineInput} />
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatPence(rowCost(row))}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${row.label || "this line"}`}
                      onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                      className={`rounded px-2 py-1 ${ui.navItem}`}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {state.errors.lines ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{state.errors.lines}</p> : null}

          <div className="mt-3 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setRows((current) => [...current, { key: nextKey++, label: "", unit: "", quantity: "1" }])}
              className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}
            >
              Add a line
            </button>
            <dl className="flex items-baseline gap-4 text-sm font-semibold">
              <dt>Total cost</dt>
              <Money pence={costPence} />
            </dl>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h2 className="text-base font-semibold">What it sells for</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price" name="price" error={state.errors.price} hint="What the shopper pays, VAT included.">
              {(props) => <input {...props} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />}
            </Field>
            <Field label="Was-price" name="compareAtPrice" error={state.errors.compareAtPrice} hint="Optional. Shown struck through.">
              {(props) => (
                <input {...props} inputMode="decimal" defaultValue={product.compareAtPence !== null ? pounds(product.compareAtPence) : ""} className={inputClass} />
              )}
            </Field>
          </div>

          <Field label="VAT" name="vatRate" error={state.errors.vatRate} hint="Children's clothing is zero-rated.">
            {(props) => (
              <select {...props} value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={inputClass}>
                {VAT_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {VAT_LABEL[rate]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div role="group" aria-label="What it makes" className={`rounded-md border p-4 ${ui.card} ${ui.rule}`}>
            <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
              <dt>VAT</dt>
              <Money pence={breakdown.vatPence} />
              <dt>After VAT</dt>
              <Money pence={breakdown.exVatPence} />
              <dt>Costs</dt>
              <Money pence={costPence} />
              <dt className="font-semibold">Profit</dt>
              <Money pence={breakdown.profitPence} loss />
            </dl>
            {breakdown.costMultiple !== null ? (
              <p className={`mt-3 text-xs ${ui.mutedOnPanel}`}>
                ×{breakdown.costMultiple.toFixed(2)} on cost - what her price lists call the online margin.
              </p>
            ) : (
              <p className={`mt-3 text-xs ${ui.mutedOnPanel}`}>Add its costs to see the margin.</p>
            )}
          </div>

          <div role="group" aria-label="On Not On The High Street" className={`rounded-md border p-4 ${ui.rule}`}>
            <p className="text-sm font-medium">On Not On The High Street</p>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
              <dt>Their {NOTHS_FEE_PERCENT}%</dt>
              <Money pence={noths.feePence} />
              <dt>VAT</dt>
              <Money pence={noths.vatPence} />
              <dt className="font-semibold">Profit</dt>
              <Money pence={noths.profitPence} loss />
            </dl>
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-base font-semibold">If it goes on sale</h2>
        <table aria-label="If it goes on sale" className="mt-3 w-full max-w-md border-collapse text-sm">
          <thead>
            <tr className={`border-b text-left ${ui.tableHead}`}>
              <th className="py-2 pr-4 font-medium">Discount</th>
              <th className="py-2 pr-4 text-right font-medium">Sells for</th>
              <th className="py-2 text-right font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((step) => (
              <tr key={step.percent} className={`border-b ${ui.tableRow}`}>
                <td className="py-1.5 pr-4">{step.percent}% off</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{formatPence(step.salePricePence)}</td>
                <td className={`py-1.5 text-right tabular-nums ${step.profitPence < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {formatPence(step.profitPence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {lines.length === 0 && suggestions.length > 0 ? (
        <section>
          <h2 className="text-base font-semibold">From your price lists</h2>
          <p className={`mt-1 max-w-prose text-sm ${ui.mutedOnPage}`}>
            These rows from your 2023 price lists might be this piece - best guess first. Choose one to fill its costs
            in, then check them and save. Its old price is shown, but never copied.
          </p>

          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className={`flex flex-col gap-2 rounded-md border p-2 ${ui.rule} ${fromEntry?.id === suggestion.id ? ui.navActive : ""}`}>
                <span className="relative block aspect-square overflow-hidden rounded bg-nyoki-soft-ash dark:bg-nyoki-navy">
                  {suggestion.photoUrl ? (
                    <Image src={suggestion.photoUrl} alt="" fill sizes="(min-width: 640px) 12rem, 45vw" className="object-cover" />
                  ) : null}
                </span>
                <span className="text-xs font-medium">{suggestion.source}</span>
                {suggestion.note ? <span className={`text-xs ${ui.mutedOnPage}`}>{suggestion.note}</span> : null}
                <span className={`text-xs ${ui.mutedOnPage}`}>
                  Costs {formatPence(productionCostPence(suggestion.lines))}
                  {suggestion.pricePence > 0 ? ` · was ${formatPence(suggestion.pricePence)}` : ""}
                </span>
                <button type="button" onClick={() => adopt(suggestion)} className={`mt-auto rounded-md px-2 py-1.5 text-xs ${ui.buttonSecondary}`}>
                  Use these costs
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className={`self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
