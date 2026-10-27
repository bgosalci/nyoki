"use client";

import { Field, inputClass } from "@/components/admin/field";
import type { PostageNames } from "@/lib/delivery/postage-input";
import { PARCEL_SIZES, SIZE_NAMES } from "@/lib/delivery/royal-mail";

/** What the three boxes hold, as typed. */
export interface PostageText {
  grams: string;
  size: string;
  mm: string;
}

export const postageText = (facts: { grams: number | null; size: string | null; mm: number | null }): PostageText => ({
  grams: facts.grams === null ? "" : String(facts.grams),
  size: facts.size ?? "",
  mm: facts.mm === null ? "" : String(facts.mm),
});

/**
 * A piece's or a category's postage: its weight, the smallest of Royal Mail's
 * sizes it goes as, and how thick it is, which counts only for a letter.
 * Each box may be left empty, saying what it falls back to.
 */
export function PostageFields({
  names,
  value,
  onChange,
  errors,
  blank,
}: {
  names: PostageNames;
  value: PostageText;
  onChange: (value: PostageText) => void;
  errors: Partial<Record<string, string>>;
  /** What an empty box means: its placeholder, and the empty size's name. */
  blank: { grams: string; size: string; mm: string };
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      <Field label="Weight, in grams" name={names.grams} error={errors[names.grams]} hint="In its own wrapping, without the outer envelope or box.">
        {(props) => (
          <input
            {...props}
            type="text"
            inputMode="numeric"
            value={value.grams}
            placeholder={blank.grams}
            onChange={(event) => onChange({ ...value, grams: event.target.value })}
            className={`tabular-nums ${inputClass}`}
          />
        )}
      </Field>

      <Field label="Goes in the post as" name={names.size} error={errors[names.size]} hint="The smallest of Royal Mail's sizes it fits.">
        {(props) => (
          <select {...props} value={value.size} onChange={(event) => onChange({ ...value, size: event.target.value })} className={inputClass}>
            <option value="">{blank.size}</option>
            {PARCEL_SIZES.map((size) => (
              <option key={size} value={size}>
                {SIZE_NAMES[size]}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Thickness, in millimetres" name={names.mm} error={errors[names.mm]} hint="For a letter: up to 5 mm is a Letter, up to 25 mm a Large Letter.">
        {(props) => (
          <input
            {...props}
            type="text"
            inputMode="numeric"
            value={value.mm}
            placeholder={blank.mm}
            onChange={(event) => onChange({ ...value, mm: event.target.value })}
            className={`tabular-nums ${inputClass}`}
          />
        )}
      </Field>
    </div>
  );
}
