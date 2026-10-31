"use client";

import { useActionState, useId, useRef, useState } from "react";

import { Checkbox } from "@/components/admin/checkbox";
import { Field, inputClass } from "@/components/admin/field";
import { TopSaveButton } from "@/components/admin/save-slot";
import { Select } from "@/components/admin/select";
import { UnsavedChanges } from "@/components/admin/unsaved-changes";
import { ui } from "@/lib/brand/ui";
import type { ItemNoun } from "@/lib/customisation/group";
import {
  PACK_MAX,
  PACK_MIN,
  TEXT_LENGTH_LIMIT,
  MESSAGE_LENGTH_LIMIT,
  blankFieldRow,
  blankPackRow,
  type CustomisationErrors,
  type CustomiseValues,
  type FieldRow,
  type PackRow,
} from "@/lib/customisation/settings";
import { formatPence, parsePoundsToPence } from "@/lib/money";

export interface CustomiseState {
  /** `form` is a refusal of the whole save rather than of one section. */
  errors: CustomisationErrors & { form?: string };
  saved?: boolean;
}

export type CustomiseAction = (state: CustomiseState, formData: FormData) => Promise<CustomiseState>;

const rowInput = `w-full rounded-md border px-2 py-1.5 text-sm outline-none ${ui.input}`;
const errorText = "text-sm text-red-600 dark:text-red-400";

/**
 * How a card or bookmark can be made up: a printed message, personalisation
 * and packs, each with what it costs.
 *
 * Controlled, since a section's settings stay - hidden, and still posted - while
 * it is switched off, and the packs say what they save as they are typed. The
 * save ignores a switched-off section, so its settings are kept for when it is
 * switched back on.
 */
export function CustomiseForm({
  noun,
  singlePricePence,
  values,
  action,
}: {
  noun: ItemNoun;
  /** The product's own price: what one sells at, so a pack can say what it saves. */
  singlePricePence: number;
  values: CustomiseValues;
  action: CustomiseAction;
}) {
  const [state, formAction, isPending] = useActionState(action, { errors: {} });
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState(values);
  const set = (patch: Partial<CustomiseValues>) => setForm((previous) => ({ ...previous, ...patch }));
  const setField = (key: number, patch: Partial<FieldRow>) =>
    set({ fields: form.fields.map((row) => (row.key === key ? { ...row, ...patch } : row)) });
  const setPack = (key: number, patch: Partial<PackRow>) =>
    set({ packs: form.packs.map((row) => (row.key === key ? { ...row, ...patch } : row)) });

  const { errors } = state;
  const many = noun.many[0].toUpperCase() + noun.many.slice(1);

  return (
    <form id="product-customise" ref={formRef} action={formAction} className="mt-8 flex max-w-3xl flex-col gap-10">
      <UnsavedChanges formRef={formRef} saved={state.saved ? state : null} />
      <TopSaveButton form="product-customise" pending={isPending} label="Save" />

      {errors.form ? (
        <p role="alert" className={`rounded-md border px-3 py-2 ${errorText} ${ui.rule}`}>
          {errors.form}
        </p>
      ) : null}

      {state.saved ? (
        <p role="status" className={`rounded-md border px-3 py-2 text-sm ${ui.card} ${ui.rule}`}>
          Saved. The shop offers these choices now.
        </p>
      ) : null}

      <Section title="Message inside" intro={`Words the shopper types, printed inside the ${noun.one}.`}>
        <Switch name="message" checked={form.message} onChange={(message) => set({ message })}>
          Offer a printed message inside
        </Switch>
        <div hidden={!form.message} className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Extra cost for a message (£)"
            name="messagePrice"
            error={errors.messagePrice}
            hint={`Per ${noun.one}, so a pack pays it for each one. Leave empty for no charge.`}
          >
            {(props) => (
              <input {...props} inputMode="decimal" value={form.messagePrice} onChange={(e) => set({ messagePrice: e.target.value })} className={inputClass} />
            )}
          </Field>
          <Field label="Longest message" name="messageMaxLength" error={errors.messageMaxLength} hint="In characters, spaces included.">
            {(props) => (
              <input
                {...props}
                type="number"
                min={1}
                max={MESSAGE_LENGTH_LIMIT}
                value={form.messageMaxLength}
                onChange={(e) => set({ messageMaxLength: e.target.value })}
                className={inputClass}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Personalisation" intro={`What the shopper can have put on the ${noun.one}: a name, an initial, a star sign.`}>
        <Switch name="personalisation" checked={form.personalisation} onChange={(personalisation) => set({ personalisation })}>
          Offer personalisation
        </Switch>
        <div hidden={!form.personalisation} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Extra cost for personalising (£)"
              name="personalisationPrice"
              error={errors.personalisationPrice}
              hint={`Per ${noun.one}. Leave empty for no charge - for one that is only sold personalised, the price may cover it.`}
            >
              {(props) => (
                <input
                  {...props}
                  inputMode="decimal"
                  value={form.personalisationPrice}
                  onChange={(e) => set({ personalisationPrice: e.target.value })}
                  className={inputClass}
                />
              )}
            </Field>
          </div>
          <Switch
            name="personalisationRequired"
            checked={form.personalisationRequired}
            onChange={(personalisationRequired) => set({ personalisationRequired })}
          >
            Only sold personalised: the shopper must fill it in
          </Switch>

          <div className="flex flex-col">
            <h3 className="text-sm font-semibold">What can be personalised</h3>
            <p className={`mt-1 text-sm ${ui.mutedOnPage}`}>
              Each thing is typed by the shopper, like a name, or chosen from a list, like an initial or a star sign. A
              shopper personalising fills in every one.
            </p>
            <ul className="mt-3 flex flex-col">
              {form.fields.map((row, index) => {
                const n = index + 1;
                return (
                  <li key={row.key} className={`grid items-start gap-2 border-b py-3 sm:grid-cols-[1fr_11rem_1fr_auto] ${ui.tableRow}`}>
                    <input
                      aria-label={`What is personalised (thing ${n})`}
                      name="fieldLabel"
                      placeholder="Name"
                      value={row.label}
                      onChange={(e) => setField(row.key, { label: e.target.value })}
                      className={rowInput}
                    />
                    <Select
                      aria-label={`Kind (thing ${n})`}
                      name="fieldKind"
                      value={row.kind}
                      onChange={(e) => setField(row.key, { kind: e.target.value === "CHOICE" ? "CHOICE" : "TEXT" })}
                      className={rowInput}
                    >
                      <option value="TEXT">Typed</option>
                      <option value="CHOICE">Chosen from a list</option>
                    </Select>
                    {/* Every row posts all four lists, so they stay in step; the
                        one its kind does not use is posted empty. */}
                    {row.kind === "TEXT" ? (
                      <>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="number"
                            aria-label={`Most characters (thing ${n})`}
                            name="fieldMaxLength"
                            min={1}
                            max={TEXT_LENGTH_LIMIT}
                            value={row.maxLength}
                            onChange={(e) => setField(row.key, { maxLength: e.target.value })}
                            className={`${rowInput} w-20`}
                          />
                          <span aria-hidden="true" className={`whitespace-nowrap ${ui.mutedOnPage}`}>
                            characters
                          </span>
                        </label>
                        <input type="hidden" name="fieldChoices" value="" />
                      </>
                    ) : (
                      <>
                        <textarea
                          aria-label={`Choices, one per line (thing ${n})`}
                          name="fieldChoices"
                          rows={4}
                          placeholder={"♈ Aries\n♉ Taurus"}
                          value={row.choices}
                          onChange={(e) => setField(row.key, { choices: e.target.value })}
                          className={rowInput}
                        />
                        <input type="hidden" name="fieldMaxLength" value="" />
                      </>
                    )}
                    <RemoveButton
                      label={`Remove ${row.label.trim() || `thing ${n}`}`}
                      onClick={() => set({ fields: form.fields.filter((r) => r.key !== row.key) })}
                    />
                  </li>
                );
              })}
            </ul>
            {errors.fields ? <p className={`mt-2 ${errorText}`}>{errors.fields}</p> : null}
            <AddButton onClick={() => set({ fields: [...form.fields, blankFieldRow()] })}>Add a thing to personalise</AddButton>
          </div>
        </div>
      </Section>

      <Section
        title="Packs"
        intro={`The same ${noun.one} sold in packs, each at its own price. A single ${noun.one} sells at ${formatPence(
          singlePricePence,
        )}, the price on the Price tab. No packs, and only singles are sold.`}
      >
        <ul className="flex flex-col">
          {form.packs.map((row, index) => {
            const n = index + 1;
            return (
              <li key={row.key} className={`grid items-center gap-2 border-b py-3 sm:grid-cols-[8rem_9rem_1fr_auto] ${ui.tableRow}`}>
                <input
                  type="number"
                  aria-label={`${many} in pack ${n}`}
                  name="packCards"
                  min={PACK_MIN}
                  max={PACK_MAX}
                  placeholder="3"
                  value={row.cards}
                  onChange={(e) => setPack(row.key, { cards: e.target.value })}
                  className={rowInput}
                />
                <input
                  aria-label={`Price of pack ${n} (£)`}
                  name="packPrice"
                  inputMode="decimal"
                  placeholder="15.00"
                  value={row.price}
                  onChange={(e) => setPack(row.key, { price: e.target.value })}
                  className={rowInput}
                />
                <span className={`text-sm ${ui.mutedOnPage}`}>{packSaving(row, singlePricePence, noun)}</span>
                <RemoveButton
                  label={row.cards.trim() ? `Remove the pack of ${row.cards.trim()}` : `Remove pack ${n}`}
                  onClick={() => set({ packs: form.packs.filter((r) => r.key !== row.key) })}
                />
              </li>
            );
          })}
        </ul>
        {errors.packs ? <p className={errorText}>{errors.packs}</p> : null}
        <AddButton onClick={() => set({ packs: [...form.packs, blankPackRow()] })}>Add a pack</AddButton>
      </Section>

      <button type="submit" disabled={isPending} className={`self-start rounded-md px-4 py-2.5 text-sm font-medium ${ui.buttonPrimary}`}>
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

/** What a pack saves against the same number bought singly, once both are readable. */
function packSaving(row: PackRow, singlePricePence: number, noun: ItemNoun): string {
  const cards = /^\d+$/.test(row.cards.trim()) ? Number(row.cards.trim()) : NaN;
  const pricePence = parsePoundsToPence(row.price);
  if (!(cards >= PACK_MIN && cards <= PACK_MAX) || pricePence === null) return "";

  const saving = singlePricePence * cards - pricePence;
  return saving > 0
    ? `Saves ${formatPence(saving)} against ${cards} single ${noun.many}`
    : `No saving against ${cards} single ${noun.many}`;
}

function Section({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        <p className={`mt-1 max-w-prose text-sm ${ui.mutedOnPage}`}>{intro}</p>
      </div>
      {children}
    </section>
  );
}

function Switch({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-2.5 self-start text-sm">
      <Checkbox name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className={`size-4 ${ui.checkbox}`} />
      {children}
    </label>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`mt-3 self-start rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}>
      {children}
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={`justify-self-end rounded px-2 py-1 ${ui.navItem}`}>
      ×
    </button>
  );
}
