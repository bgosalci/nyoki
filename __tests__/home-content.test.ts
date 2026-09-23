import { HOME_DEFAULTS, heroImageFor, validateHomeInput } from "@/lib/home/content";

function form(fields: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((entry) => data.append(key, entry));
    else data.set(key, value);
  }
  return data;
}

const filled = {
  headline: "  Made by hand, the kind way  ",
  intro: "Cards, clothes and little things for the home.",
  ctaLabel: "Shop everything",
  featuredHeading: "Just made",
  heroProductId: "p1",
  promises: ["Every piece touched by human hands", "Materials sourced in the UK"],
};

describe("HOME_DEFAULTS", () => {
  it("is a complete page in its own right, so a shop that has never edited it still reads", () => {
    expect(HOME_DEFAULTS.headline.length).toBeGreaterThan(0);
    expect(HOME_DEFAULTS.ctaLabel.length).toBeGreaterThan(0);
    expect(HOME_DEFAULTS.featuredHeading.length).toBeGreaterThan(0);
    expect(HOME_DEFAULTS.promises.length).toBeGreaterThan(0);
  });
});

describe("validateHomeInput", () => {
  it("takes the whole page and trims what was typed", () => {
    expect(validateHomeInput(form(filled))).toEqual({
      ok: true,
      data: {
        headline: "Made by hand, the kind way",
        intro: "Cards, clothes and little things for the home.",
        ctaLabel: "Shop everything",
        featuredHeading: "Just made",
        heroProductId: "p1",
        promises: ["Every piece touched by human hands", "Materials sourced in the UK"],
      },
    });
  });

  it("insists on a headline, which is the page's first words", () => {
    const result = validateHomeInput(form({ ...filled, headline: "   " }));

    expect(result.ok === false && result.errors.headline).toBeTruthy();
  });

  it("insists on a label for the button, since a blank one cannot be clicked knowingly", () => {
    const result = validateHomeInput(form({ ...filled, ctaLabel: "" }));

    expect(result.ok === false && result.errors.ctaLabel).toBeTruthy();
  });

  it("lets the paragraph be emptied, which simply leaves it out", () => {
    const result = validateHomeInput(form({ ...filled, intro: "  " }));

    expect(result.ok === true && result.data.intro).toBeNull();
  });

  it("drops blank promises rather than printing empty lines on the strip", () => {
    const result = validateHomeInput(form({ ...filled, promises: ["Kept", "   ", "Also kept"] }));

    expect(result.ok === true && result.data.promises).toEqual(["Kept", "Also kept"]);
  });

  it("takes no hero at all as choosing automatically", () => {
    const result = validateHomeInput(form({ ...filled, heroProductId: "" }));

    expect(result.ok === true && result.data.heroProductId).toBeNull();
  });
});

describe("heroImageFor", () => {
  const chosen = { id: "p1", name: "Green Cardigan", slug: "green-cardigan", image: { url: "/chosen.jpg" } };
  const newest = { id: "p9", name: "Newest Thing", slug: "newest-thing", image: { url: "/newest.jpg" } };

  it("shows the piece that was chosen", () => {
    expect(heroImageFor(chosen, newest)?.slug).toBe("green-cardigan");
  });

  it("falls back to the newest when nothing was chosen", () => {
    expect(heroImageFor(null, newest)?.slug).toBe("newest-thing");
  });

  it("falls back when the chosen piece has lost its photo", () => {
    // Archived, or its only photo deleted. The page must not go blank over it.
    expect(heroImageFor({ ...chosen, image: null }, newest)?.slug).toBe("newest-thing");
  });

  it("shows nothing at all rather than breaking when there is no photo anywhere", () => {
    expect(heroImageFor(null, null)).toBeNull();
  });
});
