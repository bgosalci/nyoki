"use client";

import { useEffect, useId, useRef } from "react";

import { ui } from "@/lib/brand/ui";
import {
  addRow,
  gridCells,
  moveRow,
  removeRow,
  renameRow,
  setStock,
  stockAt,
  type Axis,
  type AxisRow,
  type ClothingEditor,
} from "@/lib/clothes/editor";
import { NAME_MAX, stockFieldName, type ClothingErrors } from "@/lib/clothes/settings";

/** Where the Stock slot at the top of the form points, once stock is kept per colour and size. */
export const CLOTHING_STOCK_ID = "clothing-stock";

const rowInput = `w-full rounded-md border px-3 py-2 text-sm outline-none ${ui.input}`;
const errorText = "text-sm text-red-600 dark:text-red-400";

/** "Lupin", or "colour 2" for a row not yet named. */
const nameOf = (row: AxisRow | null, index: number | null, one: string) => (row ? row.name.trim() || `${one} ${(index ?? 0) + 1}` : "");

/**
 * A piece of clothing's colours, its sizes, and the stock of each colour in
 * each size - in the Details form where anything else has its dimensions.
 *
 * Controlled: the form holds the editor, since the Stock slot at its top
 * shows the total. Every row posts its name and the name it was saved under,
 * so a renamed colour keeps its stock; see src/lib/clothes/settings.ts.
 */
export function ClothingFields({
  editor,
  onChange,
  errors,
  hidden,
}: {
  editor: ClothingEditor;
  onChange: (editor: ClothingEditor) => void;
  errors: ClothingErrors;
  hidden: boolean;
}) {
  return (
    <div hidden={hidden} className="flex flex-col gap-6">
      <AxisList
        axis="colours"
        legend="Colours"
        one="colour"
        hint="A shopper must choose one. Leave this empty for a piece that comes in one colour."
        placeholder="Sage"
        editor={editor}
        onChange={onChange}
        error={errors.colours}
      />
      <AxisList
        axis="sizes"
        legend="Sizes"
        one="size"
        hint="A shopper must choose one. The shop lists them in this order."
        placeholder="0-3 months"
        editor={editor}
        onChange={onChange}
        error={errors.sizes}
      />
      <StockGrid editor={editor} onChange={onChange} error={errors.variantStock} />
    </div>
  );
}

function AxisList({
  axis,
  legend,
  one,
  hint,
  placeholder,
  editor,
  onChange,
  error,
}: {
  axis: Axis;
  legend: string;
  one: string;
  hint: string;
  placeholder: string;
  editor: ClothingEditor;
  onChange: (editor: ClothingEditor) => void;
  error?: string;
}) {
  const legendId = useId();
  const hintId = useId();
  const list = useRef<HTMLUListElement>(null);
  // The row just added, to put the cursor in once it is on the page.
  const added = useRef<number | null>(null);
  const rows = editor[axis];
  const field = axis === "colours" ? "colour" : "size";
  const label = one[0].toUpperCase() + one.slice(1);

  useEffect(() => {
    if (added.current === null) return;
    list.current?.querySelector<HTMLInputElement>(`[data-row="${added.current}"]`)?.focus();
    added.current = null;
  });

  return (
    // Marked for a save turned down, which goes to the list (`useFocusFirstError`).
    <fieldset aria-labelledby={legendId} aria-describedby={hintId} data-invalid={error ? "" : undefined} className="flex flex-col gap-2">
      <legend id={legendId} className="text-sm font-medium">
        {legend}
      </legend>
      <p id={hintId} className={`text-xs ${ui.mutedOnPage}`}>
        {hint}
      </p>

      {rows.length > 0 ? (
        <ul ref={list} className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const name = nameOf(row, index, one);
            return (
              <li key={row.key} className="flex items-center gap-1.5">
                <input
                  type="text"
                  name={field}
                  aria-label={`${label} ${index + 1}`}
                  data-row={row.key}
                  value={row.name}
                  maxLength={NAME_MAX}
                  placeholder={placeholder}
                  onChange={(event) => onChange(renameRow(editor, axis, row.key, event.target.value))}
                  // Enter in a form's text box would save the product.
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  autoComplete="off"
                  className={`${rowInput} max-w-xs`}
                />
                <input type="hidden" name={`${field}Was`} value={row.was} />
                <RowButton label={`Move ${name} up`} disabled={index === 0} onClick={() => onChange(moveRow(editor, axis, row.key, -1))}>
                  ↑
                </RowButton>
                <RowButton label={`Move ${name} down`} disabled={index === rows.length - 1} onClick={() => onChange(moveRow(editor, axis, row.key, 1))}>
                  ↓
                </RowButton>
                <RowButton label={`Remove ${name}`} onClick={() => onChange(removeRow(editor, axis, row.key))}>
                  ×
                </RowButton>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? <p className={errorText}>{error}</p> : null}

      <button
        type="button"
        onClick={() => {
          const next = addRow(editor, axis);
          added.current = next[axis][next[axis].length - 1].key;
          onChange(next);
        }}
        className={`self-start rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}
      >
        Add a {one}
      </button>
    </fieldset>
  );
}

function RowButton({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded disabled:invisible ${ui.navItem}`}
    >
      {children}
    </button>
  );
}

/**
 * A box for each colour in each size: colours down the side, sizes across
 * the top. A piece in sizes only has one row of them, in colours only one
 * column.
 */
function StockGrid({ editor, onChange, error }: { editor: ClothingEditor; onChange: (editor: ClothingEditor) => void; error?: string }) {
  const headingId = useId();
  const cells = gridCells(editor);
  if (cells.length === 0) return null;

  const { colours, sizes } = editor;
  const heading =
    colours.length > 0 && sizes.length > 0 ? "Stock of each colour in each size" : colours.length > 0 ? "Stock of each colour" : "Stock of each size";
  const columns = sizes.length > 0 ? sizes.map((row, index) => ({ row, index })) : [{ row: null, index: null }];
  const rows = colours.length > 0 ? colours.map((row, index) => ({ row, index })) : [{ row: null, index: null }];

  return (
    <section id={CLOTHING_STOCK_ID} aria-labelledby={headingId} data-invalid={error ? "" : undefined} className="flex scroll-mt-40 flex-col gap-2">
      <h3 id={headingId} className="text-sm font-medium">
        {heading}
      </h3>
      <p className={`text-xs ${ui.mutedOnPage}`}>
        One with none in stock shows as out of stock on the shop, unless the piece is made to order or made on order.
      </p>

      <div className="overflow-x-auto">
        <table aria-labelledby={headingId} className="border-separate border-spacing-x-2 border-spacing-y-1.5 text-sm">
          <thead>
            <tr>
              <td />
              {columns.map(({ row, index }) => (
                <th key={row?.key ?? "stock"} scope="col" className="px-1 text-left font-medium">
                  {row ? nameOf(row, index, "size") : "Stock"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row: colour, index: colourIndex }) => (
              <tr key={colour?.key ?? "stock"}>
                <th scope="row" className="pr-2 text-left font-medium whitespace-nowrap">
                  {colour ? nameOf(colour, colourIndex, "colour") : "In stock"}
                </th>
                {columns.map(({ row: size, index: sizeIndex }) => {
                  const colourName = nameOf(colour, colourIndex, "colour");
                  const sizeName = nameOf(size, sizeIndex, "size");
                  const label = colour && size ? `Stock of ${colourName} in ${sizeName}` : colour ? `Stock of ${colourName}` : `Stock in ${sizeName}`;
                  return (
                    <td key={size?.key ?? "stock"}>
                      <input
                        type="text"
                        inputMode="numeric"
                        name={stockFieldName(colourIndex, sizeIndex)}
                        aria-label={label}
                        placeholder="0"
                        value={stockAt(editor, colour?.key ?? null, size?.key ?? null)}
                        onChange={(event) => onChange(setStock(editor, colour?.key ?? null, size?.key ?? null, event.target.value))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.preventDefault();
                        }}
                        autoComplete="off"
                        className={`w-20 rounded-md border px-2 py-1.5 text-right text-sm tabular-nums outline-none ${ui.input}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className={errorText}>{error}</p> : null}
    </section>
  );
}
