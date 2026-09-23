/**
 * The home page's editable content.
 *
 * Everything here used to be a string in the page's own source, which meant
 * the shop's first words could only be changed by someone who could deploy.
 */

export interface HomeContent {
  headline: string;
  intro: string | null;
  ctaLabel: string;
  featuredHeading: string;
  promises: string[];
  heroProductId: string | null;
}

/**
 * What the page says before anybody has edited it.
 *
 * A complete page rather than placeholder text: a shop that never opens this
 * screen still reads as written, not as a form somebody forgot to fill in.
 */
export const HOME_DEFAULTS: HomeContent = {
  headline: "Made by hand, the kind way",
  intro:
    "Cards, clothes and little things for the home — crocheted, stitched and printed in the UK. A tradition carried from our mothers and grandmothers in Kosovo, made for now.",
  ctaLabel: "Shop everything",
  featuredHeading: "Just made",
  promises: [
    "Every piece touched by human hands",
    "Eco-friendly, organic and recyclable",
    "Materials sourced in the UK",
  ],
  heroProductId: null,
};

export type HomeField = "headline" | "intro" | "ctaLabel" | "featuredHeading" | "promises";
export type HomeErrors = Partial<Record<HomeField, string>>;

export type HomeValidation = { ok: true; data: HomeContent } | { ok: false; errors: HomeErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function validateHomeInput(form: FormData): HomeValidation {
  const errors: HomeErrors = {};

  const headline = text(form, "headline");
  if (headline.length === 0) errors.headline = "Give the page a headline.";

  const ctaLabel = text(form, "ctaLabel");
  if (ctaLabel.length === 0) errors.ctaLabel = "Say what the button should read.";

  const featuredHeading = text(form, "featuredHeading");
  if (featuredHeading.length === 0) {
    errors.featuredHeading = "Give the row of pieces a heading.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const intro = text(form, "intro");
  const heroProductId = text(form, "heroProductId");

  return {
    ok: true,
    data: {
      headline,
      // Emptied on purpose leaves the paragraph out; it is not a mistake.
      intro: intro.length > 0 ? intro : null,
      ctaLabel,
      featuredHeading,
      promises: form
        .getAll("promises")
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
      heroProductId: heroProductId.length > 0 ? heroProductId : null,
    },
  };
}

export interface HeroPiece {
  id: string;
  name: string;
  slug: string;
  image: { url: string } | null;
}

/**
 * The piece whose photo leads the page.
 *
 * The chosen one wins, but only while it still has a photo to show: it can be
 * archived, or have its last photo deleted, long after it was picked. The
 * newest piece with a photo stands in, and the page is never left blank over
 * a decision taken months ago.
 */
export function heroImageFor(chosen: HeroPiece | null, newest: HeroPiece | null): HeroPiece | null {
  if (chosen?.image) return chosen;
  return newest?.image ? newest : null;
}
