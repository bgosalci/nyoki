"use client";

import type { PostageText } from "@/components/admin/postage-fields";
import { ui } from "@/lib/brand/ui";
import { postageOf, withUsual, type DeliverySettingsData, type PostageFacts, type RateSource } from "@/lib/delivery/parcel";
import { quoteFor, quoteSentence } from "@/lib/delivery/quote";
import { MAX_THICKNESS_MM, SIZE_NAMES, isParcelSize } from "@/lib/delivery/royal-mail";

/** What the delivery side of the admin needs to price a piece as it is typed. */
export interface PostageContext {
  settings: DeliverySettingsData;
  /** The options offered at checkout. */
  rates: RateSource[];
}

const whole = (raw: string) => (/^\d+$/.test(raw.trim()) ? Number.parseInt(raw.trim(), 10) : null);

/** The boxes as typed, read as far as they can be: anything not yet a number counts as left empty. */
export function factsOf(text: PostageText): PostageFacts {
  return { grams: whole(text.grams), size: isParcelSize(text.size) ? text.size : null, mm: whole(text.mm) };
}

/**
 * What a piece costs to send, worked out as its postage is typed: on its own
 * and in each pack, by every option offered. A wrong weight stands out here
 * before a shopper is charged by it.
 */
export function PostageSummary({
  text,
  usual,
  context,
  packs = [],
}: {
  text: PostageText;
  usual: PostageFacts | null;
  context: PostageContext;
  /** How many cards each of its packs holds. */
  packs?: readonly number[];
}) {
  const facts = withUsual(factsOf(text), usual);
  const postage = postageOf(facts, context.settings);
  const { packing } = context.settings;
  const alone = quoteFor(postage, 1, context.rates, packing);
  const thickest = MAX_THICKNESS_MM[postage.size];

  return (
    <div className={`flex flex-col gap-1.5 rounded-md px-4 py-3 text-sm ${ui.card}`}>
      {!postage.weighed ? (
        <p>
          Not weighed, so it counts as {postage.grams} g, sent as a {SIZE_NAMES[postage.size]}.
        </p>
      ) : null}
      {thickest !== undefined && facts.mm === null ? <p>No thickness given, so it counts as {thickest} mm, as thick as a {SIZE_NAMES[postage.size]} can be.</p> : null}
      {alone ? (
        <p>
          <span className="font-medium">On its own:</span> {quoteSentence(alone)}
        </p>
      ) : null}
      {packs.map((cards) => {
        const quote = quoteFor(postage, cards, context.rates, packing);
        return quote ? (
          <p key={cards}>
            <span className="font-medium">A pack of {cards}:</span> {quoteSentence(quote)}
          </p>
        ) : null;
      })}
    </div>
  );
}
