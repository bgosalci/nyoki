"use client";

import { useRef, useState } from "react";

import { postageText, type PostageText } from "@/components/admin/postage-fields";
import { factsOf, type PostageContext } from "@/components/admin/postage-summary";
import { inputClass } from "@/components/admin/field";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { Select } from "@/components/admin/select";
import { UnsavedChanges } from "@/components/admin/unsaved-changes";
import { ui } from "@/lib/brand/ui";
import { postageOf, withUsual, type PostageFacts } from "@/lib/delivery/parcel";
import { postageStatus, type PostageStatus } from "@/lib/delivery/postage-input";
import { quoteFor } from "@/lib/delivery/quote";
import { PARCEL_SIZES, SIZE_NAMES, isLetterSize } from "@/lib/delivery/royal-mail";
import type { Usual } from "@/lib/delivery/usual";
import { useActionForm } from "@/lib/forms/action-form";
import { formatPence } from "@/lib/money";
import { matchesEveryWord } from "@/lib/search";

export interface WeighRow {
  id: string;
  name: string;
  image: string | null;
  /** Its categories by their places in the tree, to show and to search. */
  categories: string[];
  own: PostageFacts;
  usual: Usual | null;
}

export interface WeighState {
  /** Keyed by the box: "w.<id>", "s.<id>", "t.<id>". */
  errors: Partial<Record<string, string>>;
  saved?: number;
}

type Filter = PostageStatus | "all";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "unweighed", label: "Not weighed" },
  { value: "usual", label: "Using a usual" },
  { value: "weighed", label: "Weighed" },
  { value: "all", label: "All" },
];

export const weighNames = (id: string) => ({ grams: `w.${id}`, size: `s.${id}`, mm: `t.${id}` });

const textsOf = (rows: readonly WeighRow[]) => Object.fromEntries(rows.map((row) => [row.id, postageText(row.own)]));
const same = (a: PostageText, b: PostageText) => a.grams.trim() === b.grams.trim() && a.size === b.size && a.mm.trim() === b.mm.trim();

/**
 * Every piece on the shop in one sheet, to go along the shelf with the
 * kitchen scale: type a weight, press Enter, and the next piece's weight is
 * ready. An empty box goes by its category's usual, shown in grey; the last
 * column works out what the piece costs to send on its own, so a wrong
 * number stands out at once.
 *
 * Filtering hides rows, never removes them, so a change filtered out of view
 * is still saved. Rows are filtered by what is saved, so a piece does not
 * vanish from "Not weighed" while its weight is typed.
 */
export function WeighSheet({
  rows,
  context,
  action,
  initialState = { errors: {} },
}: {
  rows: WeighRow[];
  context: PostageContext;
  action: (state: WeighState, formData: FormData) => Promise<WeighState>;
  initialState?: WeighState;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;

  // Started again from what is saved whenever a save changes it.
  const savedTexts = JSON.stringify(textsOf(rows));
  const [basis, setBasis] = useState(savedTexts);
  const [values, setValues] = useState<Record<string, PostageText>>(() => textsOf(rows));
  if (basis !== savedTexts) {
    setBasis(savedTexts);
    setValues(textsOf(rows));
  }

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const weights = useRef(new Map<string, HTMLInputElement>());

  const status = new Map(rows.map((row) => [row.id, postageStatus(row.own, row.usual)]));
  const counts = Object.fromEntries(FILTERS.map(({ value }) => [value, value === "all" ? rows.length : rows.filter((row) => status.get(row.id) === value).length]));
  const shown = (row: WeighRow) =>
    (filter === "all" || status.get(row.id) === filter) && (query.trim() === "" || matchesEveryWord([row.name, ...row.categories].join(" "), query));
  const original = textsOf(rows);
  const changed = rows.filter((row) => !same(values[row.id], original[row.id])).length;

  const set = (id: string, part: Partial<PostageText>) => setValues((current) => ({ ...current, [id]: { ...current[id], ...part } }));

  /** Enter in a weight moves to the next shown piece's weight, and never saves the sheet. */
  function onWeightKey(event: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const next = rows.slice(index + 1).find(shown);
    if (next) weights.current.get(next.id)?.focus();
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex flex-col">
      <UnsavedChanges formRef={formRef} saved={state.saved !== undefined ? state : null} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-1 text-sm ${filter === value ? ui.buttonPrimary : `${ui.ruleOnPage} ${ui.mutedOnPage}`}`}
            >
              {label} <span className="font-medium tabular-nums">{counts[value]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          aria-label="Search by name or category"
          placeholder="Search by name or category"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          className={`w-full sm:w-72 ${inputClass}`}
        />
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className={`border-b text-left text-xs tracking-wide uppercase ${ui.ruleOnPage} ${ui.mutedOnPage}`}>
            <th className="py-2 pr-3 font-semibold">Piece</th>
            <th className="w-32 py-2 pr-3 font-semibold">Weight</th>
            <th className="w-48 py-2 pr-3 font-semibold">Goes as</th>
            <th className="w-28 py-2 pr-3 font-semibold">Thickness</th>
            <th className="py-2 font-semibold">On its own</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const value = values[row.id];
            const names = weighNames(row.id);
            const facts = withUsual(factsOf(value), row.usual);
            const postage = postageOf(facts, context.settings);
            const quote = quoteFor(postage, 1, context.rates, context.settings.packing);
            const cheapest = quote?.prices[0];
            const usual = row.usual;
            const problem = [errors[names.grams], errors[names.size], errors[names.mm]].find(Boolean);

            return (
              <tr key={row.id} hidden={!shown(row)} className={`border-b align-top ${ui.tableRow}`}>
                <td className="py-2.5 pr-3">
                  <input type="hidden" name="id" value={row.id} />
                  <div className="flex items-center gap-3">
                    <ProductThumbnail image={row.image ? { url: row.image, alt: null } : null} />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {row.name}
                        {!same(value, original[row.id]) ? <span aria-label="changed" className="ml-1.5 inline-block size-1.5 rounded-full bg-current align-middle" /> : null}
                      </p>
                      <p className={`text-xs ${ui.mutedOnPage}`}>{row.categories.length > 0 ? row.categories.join(", ") : "In no category"}</p>
                      {problem ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{problem}</p> : null}
                    </div>
                  </div>
                </td>
                <td className="py-2.5 pr-3">
                  <input
                    ref={(box) => {
                      if (box) weights.current.set(row.id, box);
                      else weights.current.delete(row.id);
                    }}
                    name={names.grams}
                    aria-label={`Weight of ${row.name}, in grams`}
                    type="text"
                    inputMode="numeric"
                    enterKeyHint="next"
                    value={value.grams}
                    placeholder={usual?.grams != null ? `${usual.grams} · usual` : "—"}
                    onChange={(event) => set(row.id, { grams: event.target.value })}
                    onKeyDown={(event) => onWeightKey(event, index)}
                    {...(errors[names.grams] ? { "aria-invalid": "true" as const } : {})}
                    className={`w-full tabular-nums ${inputClass}`}
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <Select
                    name={names.size}
                    aria-label={`How ${row.name} goes in the post`}
                    value={value.size}
                    onChange={(event) => set(row.id, { size: event.target.value })}
                    {...(errors[names.size] ? { "aria-invalid": "true" as const } : {})}
                    className={`w-full ${inputClass}`}
                  >
                    <option value="">{usual?.size ? `Usual: ${SIZE_NAMES[usual.size]}` : "Choose"}</option>
                    {PARCEL_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {SIZE_NAMES[size]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-2.5 pr-3">
                  {isLetterSize(postage.size) ? (
                    <input
                      name={names.mm}
                      aria-label={`Thickness of ${row.name}, in millimetres`}
                      type="text"
                      inputMode="numeric"
                      value={value.mm}
                      placeholder={usual?.mm != null ? `${usual.mm} · usual` : "mm"}
                      onChange={(event) => set(row.id, { mm: event.target.value })}
                      {...(errors[names.mm] ? { "aria-invalid": "true" as const } : {})}
                      className={`w-full tabular-nums ${inputClass}`}
                    />
                  ) : (
                    <>
                      {/* A parcel is judged by weight; a thickness given before is kept. */}
                      <input type="hidden" name={names.mm} value={value.mm} />
                      <span className={`inline-block py-2 ${ui.mutedOnPage}`} title="A parcel is judged by weight alone">
                        —
                      </span>
                    </>
                  )}
                </td>
                <td className="py-2.5">
                  {!postage.weighed ? (
                    <>
                      <span className={`inline-block rounded border border-dashed px-1.5 text-xs ${ui.ruleOnPage} ${ui.mutedOnPage}`}>Not weighed</span>
                      <p className={`mt-0.5 text-xs ${ui.mutedOnPage}`}>
                        Counts as a {postage.grams} g {SIZE_NAMES[postage.size]}
                      </p>
                    </>
                  ) : quote ? (
                    <>
                      <p className="font-medium">
                        {SIZE_NAMES[quote.packed.size]} · {quote.packed.grams} g
                      </p>
                      <p className={`text-xs ${ui.mutedOnPage}`}>
                        {cheapest ? `${formatPence(cheapest.pricePence)} by ${cheapest.name}` : "No delivery option takes it"}
                      </p>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={`sticky bottom-12 mt-4 flex flex-wrap items-center justify-between gap-3 border-t py-3 ${ui.ruleOnPage} ${ui.page}`}>
        <p role="status" className="text-sm">
          {state.saved !== undefined && changed === 0 && !isPending
            ? `Saved ${state.saved} ${state.saved === 1 ? "piece" : "pieces"}.`
            : changed > 0
              ? `${changed} ${changed === 1 ? "piece" : "pieces"} changed`
              : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={changed === 0}
            onClick={() => setValues(textsOf(rows))}
            className={`rounded-md px-3.5 py-2 text-sm font-medium disabled:opacity-50 ${ui.buttonSecondary}`}
          >
            Put back
          </button>
          <button type="submit" disabled={isPending} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
            {isPending ? "Saving…" : "Save weights"}
          </button>
        </div>
      </div>
    </form>
  );
}
