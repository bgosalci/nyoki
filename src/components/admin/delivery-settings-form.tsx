"use client";

import Link from "next/link";

import { inputClass } from "@/components/admin/field";
import { ui } from "@/lib/brand/ui";
import type { DeliverySettingsData } from "@/lib/delivery/parcel";
import { PARCEL_SIZES, SIZE_NAMES, isLetterSize } from "@/lib/delivery/royal-mail";
import type { DeliverySettingsErrors } from "@/lib/delivery/validate";
import { useActionForm } from "@/lib/forms/action-form";

export interface DeliverySettingsFormState {
  errors: DeliverySettingsErrors;
  saved: boolean;
}

const EMPTY: DeliverySettingsFormState = { errors: {}, saved: false };

/** A small box with its own label for screen readers, and its problem beneath it. */
function Box({ name, label, value, error, unit }: { name: string; label: string; value: number; error?: string; unit: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5">
        <input
          name={name}
          aria-label={label}
          type="text"
          inputMode="numeric"
          defaultValue={String(value)}
          {...(error ? { "aria-invalid": "true" as const } : {})}
          className={`w-20 tabular-nums ${inputClass}`}
        />
        <span className={`text-sm ${ui.mutedOnPage}`}>{unit}</span>
      </span>
      {error ? <span className="text-xs text-red-600 dark:text-red-400">{error}</span> : null}
    </div>
  );
}

/**
 * Postage beyond the price lists: the envelope or box each size goes in,
 * added once to a parcel, and what a piece nobody has weighed counts as, so
 * it can still be sold.
 */
export function DeliverySettingsForm({
  action,
  settings,
  unweighed,
  initialState = EMPTY,
}: {
  action: (state: DeliverySettingsFormState, formData: FormData) => Promise<DeliverySettingsFormState>;
  settings: DeliverySettingsData;
  unweighed: number;
  initialState?: DeliverySettingsFormState;
}) {
  const { state, formAction, isPending, formRef, onSubmit } = useActionForm(action, initialState, (result) => Object.keys(result.errors).length > 0);
  const errors = state.errors;

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section aria-labelledby="packing-heading" className={`flex flex-col gap-3 rounded-lg border p-4 sm:p-5 ${ui.ruleOnPage}`}>
          <div>
            <h2 id="packing-heading" className="text-base font-semibold">
              Packing
            </h2>
            <p className={`mt-1 text-sm ${ui.mutedOnPage}`}>The envelope or box each parcel goes in, added once. Pieces are weighed without it.</p>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={`border-b text-left text-xs tracking-wide uppercase ${ui.ruleOnPage} ${ui.mutedOnPage}`}>
                <th className="py-2 pr-3 font-semibold">Size</th>
                <th className="py-2 pr-3 font-semibold">Weighs</th>
                <th className="py-2 font-semibold">Thickness</th>
              </tr>
            </thead>
            <tbody>
              {PARCEL_SIZES.map((size) => (
                <tr key={size} className={`border-b last:border-b-0 ${ui.tableRow}`}>
                  <td className="py-2 pr-3 font-medium">{SIZE_NAMES[size]}</td>
                  <td className="py-2 pr-3">
                    <Box name={`${size}.grams`} label={`${SIZE_NAMES[size]} packing, in grams`} value={settings.packing[size].grams} error={errors[`${size}.grams`]} unit="g" />
                  </td>
                  <td className="py-2">
                    {isLetterSize(size) ? (
                      <Box name={`${size}.mm`} label={`${SIZE_NAMES[size]} packing, in millimetres`} value={settings.packing[size].mm} error={errors[`${size}.mm`]} unit="mm" />
                    ) : (
                      <span className={ui.mutedOnPage}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="unweighed-heading" className={`flex flex-col gap-3 rounded-lg border p-4 sm:p-5 ${ui.ruleOnPage}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="unweighed-heading" className="text-base font-semibold">
              Pieces not weighed
            </h2>
            <Link href="/admin/products/weigh" className={`text-sm ${ui.link}`}>
              Weigh pieces
            </Link>
          </div>
          <p className="text-sm">
            {unweighed === 0
              ? "Every piece on the shop has a weight, its own or its category's."
              : `${unweighed} ${unweighed === 1 ? "piece on the shop has" : "pieces on the shop have"} no weight, of their own or from their category. Until they do, each counts as`}
          </p>
          <div className="flex flex-wrap items-start gap-3 text-sm">
            <Box name="unweighedGrams" label="A piece not weighed counts as, in grams" value={settings.unweighedGrams} error={errors.unweighedGrams} unit="g" />
            <label className="flex items-center gap-2">
              <span>sent as a</span>
              <select name="unweighedSize" defaultValue={settings.unweighedSize} key={settings.unweighedSize} className={inputClass}>
                {PARCEL_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {SIZE_NAMES[size]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {errors.unweighedSize ? <p className="text-xs text-red-600 dark:text-red-400">{errors.unweighedSize}</p> : null}
        </section>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={`rounded-md px-4 py-2.5 text-sm font-medium transition-opacity ${ui.buttonPrimary}`}>
          {isPending ? "Saving…" : "Save packing"}
        </button>
        {state.saved && !isPending ? (
          <p role="status" className={`text-sm ${ui.mutedOnPage}`}>
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
