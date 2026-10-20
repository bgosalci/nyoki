"use client";

import { createContext, useContext, useId, useState } from "react";

import { ShopField } from "@/components/shop/field";
import { ui } from "@/lib/brand/ui";
import {
  EMPTY_CHOICES,
  QUANTITY_MAX,
  QUANTITY_MIN,
  SINGLE,
  clampQuantity,
  extraNote,
  missingChoices,
  packSavingPence,
  statusLine,
  summarise,
  totalPence,
  type ChoiceKey,
  type Choices,
  type MissingChoice,
} from "@/lib/customisation/choices";
import type { Offer, PersonalisationFieldOffer } from "@/lib/customisation/offer";
import { formatPence } from "@/lib/money";

// Soft 20px panels, slim tiles and pill controls, in the shop's own colours:
// white panels on the beige page, navy for what is chosen, accent beige for
// tags and notices.
const PANEL =
  "rounded-[20px] border-[1.5px] border-nyoki-light-slate bg-nyoki-white p-7 shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_30px_-18px_rgb(0_0_0/0.18)]";

// Filled boxes with a 2px outline that turns navy in use and red when wrong.
// 16px text, or a phone zooms in on the box. The scroll margins keep a box
// clear of the shop's sticky header and the sticky bar when the browser
// scrolls to it.
const INPUT =
  "w-full scroll-mt-60 scroll-mb-48 rounded-[14px] border-2 border-transparent bg-nyoki-beige px-4 py-3 text-base text-nyoki-navy outline-none transition-colors duration-150 placeholder:text-nyoki-text-dark/60 focus:border-nyoki-navy focus:bg-nyoki-white aria-[invalid=true]:border-red-700 motion-reduce:transition-none";

const NOT_YET = "Online ordering opens soon. Until then, get in touch to order this one.";

interface Customiser {
  offer: Offer;
  formId: string;
  choices: Choices;
  quantityText: string;
  missing: MissingChoice[];
  /** Shown only once Add to basket has been pressed too soon. */
  errors: Map<ChoiceKey, string>;
  totalPence: number | null;
  status: string;
  change: (patch: Partial<Choices>) => void;
  changeField: (id: string, value: string) => void;
  changeQuantity: (text: string) => void;
  tidyQuantity: () => void;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const CustomiserContext = createContext<Customiser | null>(null);

function useCustomiser(): Customiser {
  const customiser = useContext(CustomiserContext);
  if (!customiser) throw new Error("The customiser's parts go inside a CustomiserProvider.");
  return customiser;
}

/**
 * A card or bookmark's choices - single or pack, a printed message,
 * personalisation - shared between the panels, which sit with the product's
 * details, and the bar held at the bottom of the screen, which sits at the end
 * of the page so it holds over all of it.
 *
 * Nothing starts chosen, so every shopper decides for themselves. There is no
 * basket yet: Add to basket is marked unavailable but never faded, pressing it
 * too soon shows what is missing and moves to the first of it, and once
 * everything is chosen it says ordering opens soon.
 */
export function CustomiserProvider({ offer, children }: { offer: Offer; children: React.ReactNode }) {
  const formId = useId();
  const [answers, setAnswers] = useState<Choices>(EMPTY_CHOICES);
  // As typed, so the box can be blank mid-edit; tidied when it is left.
  const [quantityText, setQuantityText] = useState(String(EMPTY_CHOICES.quantity));
  const [attempted, setAttempted] = useState(false);
  const [pressedWhenDone, setPressedWhenDone] = useState(false);

  const choices: Choices = { ...answers, quantity: clampQuantity(quantityText) };
  const missing = missingChoices(offer, choices);

  const touched = () => setPressedWhenDone(false);

  const customiser: Customiser = {
    offer,
    formId,
    choices,
    quantityText,
    missing,
    errors: new Map(attempted ? missing.map((entry) => [entry.key, entry.message]) : []),
    totalPence: totalPence(offer, choices),
    status: missing.length === 0 && pressedWhenDone ? NOT_YET : statusLine(missing.length),
    change: (patch) => {
      setAnswers((previous) => ({ ...previous, ...patch }));
      touched();
    },
    changeField: (id, value) => {
      setAnswers((previous) => ({ ...previous, personalisation: { ...previous.personalisation, [id]: value } }));
      touched();
    },
    changeQuantity: (text) => {
      setQuantityText(text);
      touched();
    },
    tidyQuantity: () => setQuantityText(String(clampQuantity(quantityText))),
    submit: (event) => {
      event.preventDefault();
      if (missing.length === 0) {
        setPressedWhenDone(true);
        return;
      }

      setAttempted(true);
      // Each answer marks where to go when it is missing (`data-answer`): its
      // box, or the first tile of a choice.
      const element = event.currentTarget.querySelector<HTMLElement>(`[data-answer="${missing[0].key}"]`);
      if (element) {
        element.focus({ preventScroll: true });
        // In the middle of the screen, clear of the sticky header and bar.
        (element.closest<HTMLElement>("[role=radiogroup]") ?? element).scrollIntoView?.({ block: "center" });
      }
    },
  };

  return <CustomiserContext.Provider value={customiser}>{children}</CustomiserContext.Provider>;
}

/** The choices, and what has been chosen so far. */
export function CustomiserPanels() {
  const { offer, formId, submit } = useCustomiser();

  return (
    // POST, though nothing is sent: pressed before the page has loaded its
    // script, a GET would put what was typed in the address.
    <form id={formId} noValidate method="post" onSubmit={submit} className="flex flex-col gap-5">
      {offer.packs.length > 0 ? <UnitPanel /> : null}
      {offer.message ? <MessagePanel /> : null}
      {offer.personalisation ? <PersonalisationPanel /> : null}
      <SummaryPanel />
    </form>
  );
}

function UnitPanel() {
  const { offer, choices, errors, change } = useCustomiser();
  const { one } = offer.noun;
  const headingId = useId();
  const hintId = useId();
  const anySaving = offer.packs.some((pack) => packSavingPence(offer, pack) !== null);

  return (
    <Panel heading="Single or pack" headingId={headingId} required hint={`Buy one ${one}, or a pack${anySaving ? " and save" : ""}.`} hintId={hintId}>
      {/* "Single" and "Pack of 3" say how many on their own: a "3 cards" line
          beneath only made the tiles taller. 10.5rem is room for a price and
          its saving on one line; a phone takes one card to a row instead. */}
      <TileGroup labelledBy={headingId} describedBy={hintId} error={errors.get("unit")} className="grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))]">
        <Tile name={`${headingId}-unit`} checked={choices.unit === SINGLE} onSelect={() => change({ unit: SINGLE })} answer="unit">
          <span className="pr-6 font-medium">Single</span>{" "}
          <Price pricePence={offer.single.pricePence} wasPence={offer.single.wasPence} />
        </Tile>
        {offer.packs.map((pack) => {
          const saving = packSavingPence(offer, pack);
          return (
            <Tile key={pack.id} name={`${headingId}-unit`} checked={choices.unit === pack.id} onSelect={() => change({ unit: pack.id })}>
              <span className="pr-6 font-medium">Pack of {pack.cards}</span>{" "}
              <Price pricePence={pack.pricePence} wasPence={pack.wasPence} saving={saving} />
            </Tile>
          );
        })}
      </TileGroup>
    </Panel>
  );
}

function MessagePanel() {
  const { offer, choices, errors, change } = useCustomiser();
  const message = offer.message!;
  const headingId = useId();
  const hintId = useId();

  return (
    <Panel
      heading="Message inside"
      headingId={headingId}
      required
      hint={`We can print your words inside the ${offer.noun.one}, or leave it blank for you to write.`}
      hintId={hintId}
    >
      <TileGroup labelledBy={headingId} describedBy={hintId} error={errors.get("message")} className="grid-cols-2">
        <Tile name={`${headingId}-message`} checked={choices.message === "Blank inside"} onSelect={() => change({ message: "Blank inside" })} answer="message">
          <span className="pr-6 font-medium">Leave it blank</span>{" "}
          <span className={`text-xs ${ui.shopMuted}`}>You&apos;ll write your own</span>
        </Tile>
        <Tile name={`${headingId}-message`} checked={choices.message === "Printed message"} onSelect={() => change({ message: "Printed message" })}>
          <span className="pr-6 font-medium">Add a printed message</span>{" "}
          <span className="text-xs font-medium">{extraNote(message.pricePence, offer.noun)}</span>
        </Tile>
      </TileGroup>

      {choices.message === "Printed message" ? (
        <Reveal>
          <ShopField
            label="Your message"
            name="messageText"
            error={errors.get("messageText")}
            hint={`${choices.messageText.length} / ${message.maxLength}`}
          >
            {(props) => (
              <textarea
                {...props}
                data-answer="messageText"
                rows={4}
                maxLength={message.maxLength}
                placeholder="Type the words you'd like printed inside"
                value={choices.messageText}
                onChange={(event) => change({ messageText: event.target.value })}
                className={`${INPUT} resize-y`}
              />
            )}
          </ShopField>
        </Reveal>
      ) : null}
    </Panel>
  );
}

function PersonalisationPanel() {
  const { offer, choices, change } = useCustomiser();
  const personalisation = offer.personalisation!;
  const headingId = useId();
  const hintId = useId();
  const note = extraNote(personalisation.pricePence, offer.noun);
  const showFields = personalisation.required || choices.personalise;

  return (
    <Panel
      heading="Personalisation"
      headingId={headingId}
      required={personalisation.required}
      hint={personalisation.required ? "Made for you: tell us how to personalise it." : "We can personalise it for you."}
      hintId={hintId}
    >
      {personalisation.required ? (
        personalisation.pricePence > 0 ? <p className="-mt-2 mb-4 text-sm font-medium">{note}</p> : null
      ) : (
        <label className="relative flex cursor-pointer items-center gap-3 self-start">
          <input
            type="checkbox"
            role="switch"
            checked={choices.personalise}
            onChange={(event) => change({ personalise: event.target.checked })}
            aria-describedby={hintId}
            className="peer sr-only scroll-mt-60 scroll-mb-48"
          />
          <span
            aria-hidden="true"
            className="relative h-7 w-12 shrink-0 rounded-full bg-nyoki-navy/65 transition-colors duration-150 peer-checked:bg-nyoki-navy peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-nyoki-navy after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-nyoki-white after:shadow-sm after:transition-transform after:duration-150 peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none"
          />
          <span className="font-medium">Personalise it</span>{" "}
          <span className={`text-sm ${ui.shopMuted}`}>{note}</span>
        </label>
      )}

      {showFields ? (
        <div className={`flex flex-col gap-4 ${personalisation.required ? "" : `mt-5 border-t pt-5 ${ui.shopRule}`}`}>
          {personalisation.fields.map((field) => (
            <PersonalisationInput key={field.id} field={field} />
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function PersonalisationInput({ field }: { field: PersonalisationFieldOffer }) {
  const { choices, errors, changeField } = useCustomiser();
  const value = choices.personalisation[field.id] ?? "";
  const error = errors.get(`field:${field.id}`);

  if (field.kind === "CHOICE") {
    return (
      <ShopField label={field.label} name={`field-${field.id}`} error={error}>
        {(props) => (
          <select {...props} data-answer={`field:${field.id}`} value={value} onChange={(event) => changeField(field.id, event.target.value)} className={INPUT}>
            <option value="">Choose…</option>
            {field.choices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        )}
      </ShopField>
    );
  }

  return (
    <ShopField label={field.label} name={`field-${field.id}`} error={error} hint={field.maxLength ? `${value.length} / ${field.maxLength}` : undefined}>
      {(props) => (
        <input
          {...props}
          data-answer={`field:${field.id}`}
          type="text"
          maxLength={field.maxLength ?? undefined}
          value={value}
          onChange={(event) => changeField(field.id, event.target.value)}
          className={INPUT}
        />
      )}
    </ShopField>
  );
}

function SummaryPanel() {
  const { offer, choices } = useCustomiser();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={PANEL}>
      <h2 id={headingId} className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
        Your choices
      </h2>
      <dl data-testid="customiser-summary" aria-live="polite" className="mt-4 flex flex-col divide-y divide-nyoki-light-slate">
        {summarise(offer, choices).map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
            <dt className={`text-sm ${ui.shopMuted}`}>{row.label}</dt>
            <dd className="font-semibold break-words whitespace-pre-line">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The total, how many, and Add to basket, held 12px off the bottom of the
 * screen while the page scrolls and at rest at its end.
 */
export function CustomiserBar() {
  const { formId, choices, quantityText, totalPence: total, status, changeQuantity, tidyQuantity } = useCustomiser();
  const quantityId = useId();

  return (
    <div className="sticky bottom-3 z-20 mt-10 rounded-2xl border-[1.5px] border-nyoki-light-slate bg-nyoki-white px-4 py-3 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] sm:px-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="flex items-baseline gap-2">
          <span className={`text-sm ${ui.shopMuted}`}>Total</span>
          <span data-testid="customiser-total" className="text-xl font-semibold tabular-nums">
            {total === null ? "—" : formatPence(total)}
          </span>
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor={quantityId} className={`text-sm ${ui.shopMuted}`}>
            Quantity
          </label>
          <div className="flex items-center rounded-full bg-nyoki-beige ring-1 ring-nyoki-light-slate">
            <StepButton label="One fewer" onClick={() => changeQuantity(String(clampQuantity(choices.quantity - 1)))}>
              <path d="M5 10h10" />
            </StepButton>
            <input
              id={quantityId}
              type="number"
              inputMode="numeric"
              min={QUANTITY_MIN}
              max={QUANTITY_MAX}
              step={1}
              value={quantityText}
              onChange={(event) => changeQuantity(event.target.value)}
              onBlur={tidyQuantity}
              className="w-10 [appearance:textfield] bg-transparent text-center tabular-nums outline-none focus-visible:rounded focus-visible:outline-2 focus-visible:outline-nyoki-navy [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <StepButton label="One more" onClick={() => changeQuantity(String(clampQuantity(choices.quantity + 1)))}>
              <path d="M5 10h10M10 5v10" />
            </StepButton>
          </div>
        </div>

        {/* Never faded out or switched off: pressed too soon, it says what is
            missing. Unavailable until there is a basket to add to. */}
        <button
          type="submit"
          form={formId}
          aria-disabled="true"
          className="w-full rounded-full bg-nyoki-navy px-7 py-2.5 text-sm font-medium tracking-[0.14em] text-nyoki-beige uppercase transition-colors duration-150 hover:bg-nyoki-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-nyoki-navy min-[560px]:ml-auto min-[560px]:w-auto motion-reduce:transition-none"
        >
          Add to basket
        </button>
      </div>

      <p data-testid="customiser-status" aria-live="polite" className={`mt-2 text-sm ${ui.shopMuted}`}>
        {status}
      </p>
    </div>
  );
}

function Panel({
  heading,
  headingId,
  required = false,
  hint,
  hintId,
  children,
}: {
  heading: string;
  headingId: string;
  required?: boolean;
  hint: string;
  hintId: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className={`flex flex-col ${PANEL}`}>
      <div className="flex items-start justify-between gap-4">
        <h2 id={headingId} className={`text-xl font-medium tracking-tight ${ui.shopHeading}`}>
          {heading}
        </h2>
        <span className={`mt-0.5 shrink-0 px-2 py-0.5 text-xs font-medium tracking-wider uppercase ${ui.shopBadge}`}>
          {required ? "Required" : "Optional"}
        </span>
      </div>
      <p id={hintId} className={`mt-1 text-[0.93rem] ${ui.shopMuted}`}>
        {hint}
      </p>
      <div className="mt-5 flex flex-col">{children}</div>
    </section>
  );
}

/** A set of tiles that choose one thing, and the error beneath them. */
function TileGroup({
  labelledBy,
  describedBy,
  error,
  className,
  children,
}: {
  labelledBy: string;
  describedBy: string;
  error?: string;
  className: string;
  children: React.ReactNode;
}) {
  const errorId = useId();
  return (
    <>
      <div
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-describedby={error ? `${describedBy} ${errorId}` : describedBy}
        aria-invalid={error ? "true" : undefined}
        className={`grid gap-3 ${className}`}
      >
        {children}
      </div>
      {error ? (
        <p id={errorId} className="mt-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </>
  );
}

/**
 * One choice, as a small card: its name, then its price or what it costs.
 * Only the name keeps clear of the circle in the corner (its own pr-6), so
 * the line beneath has the card's whole width.
 * The radio stays in the page - hidden from sight, not from the keyboard or
 * a screen reader - and the card around it is its label, so Tab and the
 * arrow keys work as they do on any set of radios. 44px at the least, for a
 * thumb.
 */
function Tile({
  name,
  checked,
  onSelect,
  answer,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  /** Marks the tile Add to basket moves to when this choice is missing. */
  answer?: ChoiceKey;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`relative flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-lg px-3 py-2 text-sm leading-snug transition-colors duration-150 motion-reduce:transition-none ${
        checked ? "bg-nyoki-white ring-2 ring-nyoki-navy" : "bg-nyoki-beige ring-1 ring-nyoki-light-slate hover:bg-nyoki-accent-beige"
      } has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-nyoki-navy`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} data-answer={answer} className="sr-only scroll-mt-60 scroll-mb-48" />
      {children}
      <span
        aria-hidden="true"
        className={`absolute top-2 right-2 grid size-4 place-items-center rounded-full ${
          checked ? "bg-nyoki-navy" : "border-[1.5px] border-nyoki-navy/50 bg-nyoki-white"
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" fill="none" strokeWidth="2.4" className="size-2.5 stroke-nyoki-white">
            <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </label>
  );
}

/** A tile's price: what it sells at now, what it was in a sale, and what a pack saves. */
function Price({ pricePence, wasPence, saving = null }: { pricePence: number; wasPence: number | null; saving?: number | null }) {
  return (
    <span className="flex flex-nowrap items-center gap-x-1.5 whitespace-nowrap">
      <span className="tabular-nums">{formatPence(pricePence)}</span>
      {wasPence !== null ? (
        <>
          {" "}
          <span className="sr-only">was</span> <s className={`text-xs tabular-nums ${ui.shopMuted}`}>{formatPence(wasPence)}</s>
        </>
      ) : null}
      {saving !== null ? (
        <>
          {" "}
          {/* An outline in the logo's sage: a fill under ink read as a heavy
              grey blob beside the price. */}
          <span className="rounded-full border border-nyoki-sage px-1.5 text-xs font-medium text-nyoki-sage-deep">
            Save {formatPence(saving)}
          </span>
        </>
      ) : null}
    </span>
  );
}

/** What a choice opens, beneath a rule. */
function Reveal({ children }: { children: React.ReactNode }) {
  return <div className={`mt-5 flex flex-col gap-4 border-t pt-5 ${ui.shopRule}`}>{children}</div>;
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full text-nyoki-navy transition-colors duration-150 hover:bg-nyoki-accent-beige focus-visible:outline-2 focus-visible:outline-nyoki-navy motion-reduce:transition-none"
    >
      <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="size-4 stroke-current">
        {children}
      </svg>
    </button>
  );
}
