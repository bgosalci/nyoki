"use client";

import { useActionState, useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { PhotoField } from "@/components/admin/photo-field";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { ui } from "@/lib/brand/ui";
import {
  NOTHS_FEE_PERCENT,
  discountLadder,
  lineCostPence,
  marginPercent,
  nothsBreakdown,
  priceBreakdown,
  priceForMargin,
  productionCostPence,
  type PriceEnding,
} from "@/lib/costing/costing";
import type { EntryLine } from "@/lib/costing/import";
import { VAT_RATES, parseQuantityToHundredths, type PricingErrors } from "@/lib/costing/validate";
import { formatPence, parsePoundsToPence } from "@/lib/money";
import { parsePercentToTenths } from "@/lib/products/repricing";

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
  /** The photo's original file name, which often says what the piece is. */
  photoFilename: string | null;
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

const ENDING_LABEL: Record<PriceEnding, string> = {
  either: "50p or 99p, whichever comes first",
  "99": "99p",
  "50": "50p",
};

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
  const [manualPrice, setManualPrice] = useState(pounds(product.pricePence));
  const [marginText, setMarginText] = useState("");
  // Whichever of the two was typed last drives the other; the other follows
  // it, and the costs and VAT, as they change.
  const [driver, setDriver] = useState<"price" | "margin">("price");
  const [ending, setEnding] = useState<PriceEnding>("either");
  const [vatRate, setVatRate] = useState(String(product.vatRate));
  const [fromEntry, setFromEntry] = useState<Suggestion | null>(null);

  const costPence = productionCostPence(rows.map((row) => ({ unitPence: rowCost(row), quantityHundredths: 100 })));

  const marginTenths = driver === "margin" && marginText.trim().length > 0 ? parsePercentToTenths(marginText) : null;
  const derivedPence =
    marginTenths !== null ? priceForMargin({ costPence, vatRate: Number(vatRate), marginTenths, ending }) : null;
  const price = derivedPence !== null ? pounds(derivedPence) : manualPrice;
  const unreachable = marginTenths !== null && derivedPence === null && costPence > 0;

  function changeMargin(next: string) {
    // Clearing the margin, or making it unusable, leaves the worked-out price
    // where it is rather than snapping back to an older one.
    if (derivedPence !== null) setManualPrice(pounds(derivedPence));
    setDriver("margin");
    setMarginText(next);
  }

  function changePrice(next: string) {
    setManualPrice(next);
    setDriver("price");
  }

  const input = { pricePence: parsePoundsToPence(price) ?? 0, costPence, vatRate: Number(vatRate) };
  const breakdown = priceBreakdown(input);
  // With no costs, the whole of what is kept would read as profit - a 100%
  // margin that means nothing - so there is no margin to show.
  const margined = costPence > 0 ? marginPercent(breakdown) : null;

  // Typed, the box keeps what was typed: the tidy price usually gives a little
  // more, and rewriting the number under the cursor would fight the typing.
  // Otherwise it shows the margin the price gives.
  const marginShown = driver === "margin" ? marginText : margined !== null ? margined.toFixed(1) : "";
  const noths = nothsBreakdown(input);
  const ladder = discountLadder(input);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  /** Fills the costs in from a row, or - cleared - takes them back out. */
  function adopt(id: string | null) {
    const suggestion = suggestions.find((entry) => entry.id === id) ?? null;
    setRows((suggestion?.lines ?? lines).map(toRow));
    setVatRate(String(suggestion?.vatRate ?? product.vatRate));
    setFromEntry(suggestion);
  }

  const lineInput = `w-full rounded-md border px-2 py-1.5 text-sm outline-none ${ui.input}`;

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-10">
      {state.saved ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. The shop charges the new price now.
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="text-base font-semibold">What it costs</h2>

          {lines.length === 0 && suggestions.length > 0 ? (
            <div className="mt-4">
              <PhotoField
                label="From your price lists"
                name="fromEntry"
                items={suggestions.map((suggestion) => ({
                  id: suggestion.id,
                  title: suggestion.source,
                  details: [
                    `Costs ${formatPence(productionCostPence(suggestion.lines))}`,
                    ...(suggestion.pricePence > 0 ? [`was ${formatPence(suggestion.pricePence)}`] : []),
                    ...(suggestion.note ? [suggestion.note] : []),
                  ],
                  imageUrl: suggestion.photoUrl,
                  // A file name like "pink_mohair_booties.png" is often the
                  // only place a row says what it is.
                  searchText: [
                    suggestion.note ?? "",
                    (suggestion.photoFilename ?? "").replace(/\.[a-z0-9]+$/i, "").replace(/[_\-.]+/g, " "),
                  ].join(" "),
                }))}
                value={fromEntry?.id ?? null}
                onChange={adopt}
                emptyLabel="None chosen"
                missingLabel="A row no longer offered"
                chooserTitle="Which row is this piece?"
                lead={
                  <div className="flex items-center gap-3">
                    <ProductThumbnail image={product.image} />
                    <p className="text-sm">
                      Looking for <strong>{product.name}</strong> - best guess first.
                    </p>
                  </div>
                }
                hint={
                  fromEntry
                    ? "Its costs are filled in below. Not saved yet - check them, then save. Its old price is never copied."
                    : `${suggestions.length} ${suggestions.length === 1 ? "row" : "rows"} of your 2023 price lists ${suggestions.length === 1 ? "is" : "are"} not matched to a piece yet. If one is this piece, choose it to fill its costs in.`
                }
              />
            </div>
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
              {(props) => <input {...props} inputMode="decimal" value={price} onChange={(e) => changePrice(e.target.value)} className={inputClass} />}
            </Field>
            <Field label="Was-price" name="compareAtPrice" error={state.errors.compareAtPrice} hint="Optional. Shown struck through.">
              {(props) => (
                <input {...props} inputMode="decimal" defaultValue={product.compareAtPence !== null ? pounds(product.compareAtPence) : ""} className={inputClass} />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Margin %"
              name="margin"
              hint={
                costPence === 0
                  ? "Add its costs first."
                  : unreachable
                    ? "No price reaches a margin of 100% or more."
                    : "Type a margin to work the price out, or a price to see its margin."
              }
            >
              {(props) => (
                <input
                  {...props}
                  inputMode="decimal"
                  value={marginShown}
                  disabled={costPence === 0}
                  onChange={(e) => changeMargin(e.target.value)}
                  placeholder="e.g. 60"
                  className={`${inputClass} disabled:opacity-50`}
                />
              )}
            </Field>
            <Field label="Round up to" name="ending" hint="Up, never down, so rounding cannot cost margin.">
              {(props) => (
                <select {...props} value={ending} onChange={(e) => setEnding(e.target.value as PriceEnding)} className={inputClass}>
                  {(Object.keys(ENDING_LABEL) as PriceEnding[]).map((key) => (
                    <option key={key} value={key}>
                      {ENDING_LABEL[key]}
                    </option>
                  ))}
                </select>
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
              <dt>Margin</dt>
              <dd className={`text-right tabular-nums ${margined !== null && margined < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                {margined === null ? "—" : `${margined.toFixed(1)}%`}
              </dd>
            </dl>
            {breakdown.costMultiple !== null ? (
              <p className={`mt-3 text-xs ${ui.mutedOnPanel}`}>
                Margin is profit as a share of what is kept after VAT. ×{breakdown.costMultiple.toFixed(2)} on cost is
                what your price lists call the online margin.
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
        <table aria-label="If it goes on sale" className="mt-3 w-full max-w-2xl border-collapse text-sm">
          <thead>
            <tr className={`border-b text-left ${ui.tableHead}`}>
              <th className="py-2 pr-4 font-medium">Discount</th>
              <th className="py-2 pr-4 text-right font-medium">Sells for</th>
              <th className="py-2 pr-4 text-right font-medium">Profit on our shop</th>
              <th className="py-2 text-right font-medium">Profit on Not On The High Street</th>
            </tr>
          </thead>
          <tbody>
            {ladder.map((step) => (
              <tr key={step.percent} className={`border-b ${ui.tableRow}`}>
                <td className="py-1.5 pr-4">{step.percent}% off</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{formatPence(step.salePricePence)}</td>
                <td className={`py-1.5 pr-4 text-right tabular-nums ${step.profitPence < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {formatPence(step.profitPence)}
                </td>
                <td className={`py-1.5 text-right tabular-nums ${step.nothsProfitPence < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {formatPence(step.nothsProfitPence)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
