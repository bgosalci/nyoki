"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Field, inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import { formatPence } from "@/lib/money";
import {
  repricedPence,
  validateRepriceInput,
  type RepriceErrors,
  type RepriceFields,
} from "@/lib/products/repricing";

export interface RepriceRow {
  id: string;
  name: string;
  pricePence: number;
}

/** Enough to see the shape of the change without scrolling through hundreds. */
const PREVIEW_LIMIT = 6;

const START: RepriceFields = { mode: "INCREASE", unit: "PERCENT", value: "", rounding: "EXACT" };

/**
 * Changing the price of everything chosen in the products list.
 *
 * A bulk price change is hard to undo - the old prices are not kept anywhere -
 * so the dialog previews what each price becomes before anything is applied,
 * and hands the typed figures to the server rather than the prices it worked
 * out, which are only ever a preview.
 */
export function BulkPriceDialog({
  open,
  rows,
  onApply,
  onCancel,
}: {
  open: boolean;
  rows: RepriceRow[];
  onApply: (fields: RepriceFields) => Promise<void> | void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [fields, setFields] = useState<RepriceFields>(START);
  const [errors, setErrors] = useState<RepriceErrors>({});

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Reset during render rather than in an effect: the dialog stays mounted
  // between openings, and each one should start from a clean form rather than
  // the figures left over from the last selection it was used on.
  const [openedWith, setOpenedWith] = useState(open);

  if (open !== openedWith) {
    setOpenedWith(open);
    setFields(START);
    setErrors({});
  }

  if (!open) return null;

  const setting = fields.mode === "SET";
  const checked = validateRepriceInput(fields);
  const preview = checked.ok
    ? rows.slice(0, PREVIEW_LIMIT).map((row) => ({ ...row, next: repricedPence(row.pricePence, checked.data) }))
    : null;

  const noun = rows.length === 1 ? "product" : "products";
  const remaining = rows.length - PREVIEW_LIMIT;

  function change(patch: Partial<RepriceFields>) {
    setFields((current) => ({ ...current, ...patch }));
    setErrors({});
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className={`m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border p-6 shadow-xl ${ui.scrim} ${ui.panel} ${ui.rule}`}
    >
      <h2 id={titleId} className={`text-lg font-semibold ${ui.heading}`}>
        Change the price of {rows.length} {noun}
      </h2>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const result = validateRepriceInput(fields);

          if (!result.ok) {
            setErrors(result.errors);
            return;
          }

          setErrors({});
          void onApply(fields);
        }}
      >
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <Field label="Change" name="mode" error={errors.mode}>
            {(props) => (
              <select
                {...props}
                value={fields.mode}
                onChange={(event) =>
                  change(
                    event.target.value === "SET"
                      ? { mode: "SET", unit: "AMOUNT", rounding: "EXACT" }
                      : { mode: event.target.value },
                  )
                }
                className={inputClass}
              >
                <option value="INCREASE">Increase by</option>
                <option value="DECREASE">Reduce by</option>
                <option value="SET">Set to</option>
              </select>
            )}
          </Field>

          {setting ? null : (
            <Field label="Measured in" name="unit" error={errors.unit}>
              {(props) => (
                <select
                  {...props}
                  value={fields.unit}
                  onChange={(event) => change({ unit: event.target.value })}
                  className={inputClass}
                >
                  <option value="PERCENT">Percentage</option>
                  <option value="AMOUNT">Pounds</option>
                </select>
              )}
            </Field>
          )}

          <Field
            label={setting ? "New price" : "By how much"}
            name="value"
            error={errors.value}
            hint={fields.unit === "PERCENT" ? "A number, like 10 or 12.5" : "Pounds and pence, like 2.50"}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={fields.value}
                onChange={(event) => change({ value: event.target.value })}
                className={`w-28 ${inputClass}`}
              />
            )}
          </Field>

          {setting ? null : (
            <Field label="Round to" name="rounding" error={errors.rounding}>
              {(props) => (
                <select
                  {...props}
                  value={fields.rounding}
                  onChange={(event) => change({ rounding: event.target.value })}
                  className={inputClass}
                >
                  <option value="EXACT">The exact figure</option>
                  <option value="TEN_PENCE">Nearest 10p</option>
                  <option value="FIFTY_PENCE">Nearest 50p</option>
                  <option value="POUND">Nearest £1</option>
                </select>
              )}
            </Field>
          )}
        </div>

        <div className={`mt-5 rounded-md border p-3 ${ui.card} ${ui.rule}`}>
          {preview === null ? (
            <p className={`text-sm ${ui.mutedOnPanel}`}>Type a figure to see what each price becomes.</p>
          ) : (
            <>
              <ul className="flex flex-col gap-1.5 text-sm">
                {preview.map((row) => (
                  <li key={row.id} className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0 truncate">{row.name}</span>
                    <span className="shrink-0 tabular-nums">
                      <span className={ui.mutedOnPanel}>{formatPence(row.pricePence)}</span>
                      <span aria-hidden="true"> → </span>
                      <span className="sr-only"> becomes </span>
                      <span className="font-medium">{formatPence(row.next)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {remaining > 0 ? (
                <p className={`mt-2 text-xs ${ui.mutedOnPanel}`}>and {remaining} more</p>
              ) : null}
            </>
          )}
        </div>

        <p className={`mt-3 text-xs ${ui.mutedOnPanel}`}>
          The old prices are not kept, so this cannot be undone. A was-price the new price has caught up with is
          cleared, since there would be nothing left to show struck through.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonSecondary}`}>
            Cancel
          </button>
          <button type="submit" className={`rounded-md px-4 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
            Change {rows.length} {rows.length === 1 ? "price" : "prices"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
