import { AA_TEXT, contrastRatio } from "@/lib/brand/contrast";
import { APPROVED_TEXT_PAIRINGS, palette } from "@/lib/brand/palette";
import { surfaces, ui } from "@/lib/brand/ui";

const hexOfToken = new Map(palette.map((entry) => [entry.token, entry.hex]));
const approved = new Set(APPROVED_TEXT_PAIRINGS.map((p) => `${p.text} on ${p.surface}`));

describe("CMS surfaces", () => {
  it.each(Object.entries(surfaces))("%s puts its text in an approved pairing in both themes", (_name, surface) => {
    for (const theme of ["light", "dark"] as const) {
      const { bg, text, muted } = surface[theme];
      expect(approved).toContain(`${text} on ${bg}`);
      expect(approved).toContain(`${muted} on ${bg}`);
      expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe("CMS class recipes", () => {
  it("every recipe references only brand tokens that exist", () => {
    for (const [name, classes] of Object.entries(ui)) {
      // A token in an arbitrary value is named by its variable: var(--color-nyoki-red).
      const tokens = [...classes.matchAll(/(?:bg|text|border|accent|--color)-(nyoki-[a-z-]+)/g)].map((m) => m[1]);
      expect({ name, tokens }).toMatchObject({ tokens: expect.any(Array) });
      for (const token of tokens) {
        expect(hexOfToken.has(token)).toBe(true);
      }
    }
  });

  it("the primary button is beige on navy, and its dark variant too", () => {
    expect(ui.buttonPrimary).toMatch(/\bbg-nyoki-navy\b/);
    expect(ui.buttonPrimary).toMatch(/\btext-nyoki-beige\b/);
  });

  it("the page ground is white in light and near-black in dark", () => {
    expect(ui.page).toMatch(/\bbg-nyoki-white\b/);
    expect(ui.page).toMatch(/\bdark:bg-nyoki-night\b/);
  });

  it("never grounds a dark surface in the mid-tone navy", () => {
    // #4a5667 sits in the middle of the range. As a dark-mode background it
    // reads as washed out beside the ink page rather than as dark. It earns
    // its place there as a border, and as a raised control that is meant to
    // stand off the page - nothing else.
    const raised = ["buttonPrimary", "navActive", "pillActive", "badgeQuiet", "badgeDark"];

    for (const [name, classes] of Object.entries(ui)) {
      if (raised.includes(name)) continue;
      expect({ name, classes }).toMatchObject({ name });
      expect(classes).not.toMatch(/\bdark:bg-nyoki-navy\b/);
    }
  });

  it("marks a piece in colours with a dot of the brand's red, sage and navy - never the switch's green", () => {
    // A sign there are colours, not which: the yarns' own names, Tarn or
    // Quarry Tile, cannot be drawn.
    const colours = [...ui.shopColoursDot.matchAll(/--color-(nyoki-[a-z-]+)/g)].map((m) => m[1]);

    expect(colours).toEqual(["nyoki-red", "nyoki-sage", "nyoki-navy"]);
    expect(ui.shopColoursDot).toMatch(/\brounded-full\b/);
  });

  it("ticks a checkbox in the brand's own colour", () => {
    expect(ui.checkbox).toMatch(/\baccent-nyoki-navy\b/);
  });

  it("draws a switch a vivid green when on, in both themes, and faded navy when off", () => {
    // It was the logo's sage, deepened: a grey-green beside a grey-blue, and
    // on and off could hardly be told apart.
    const on = /(?:^|\s)peer-checked:bg-(nyoki-[a-z-]+)/.exec(ui.toggle)?.[1];
    const darkOn = /\bdark:peer-checked:bg-(nyoki-[a-z-]+)/.exec(ui.toggle)?.[1];
    const darkKnobOn = /\bdark:peer-checked:after:bg-(nyoki-[a-z-]+)/.exec(ui.toggle)?.[1];

    expect({ on, darkOn }).toEqual({ on: "nyoki-green", darkOn: "nyoki-green" });
    expect(ui.toggle).toMatch(/(?:^|\s)after:bg-nyoki-white\b/);

    // Switched on, the track stands 3:1 off the page and the knob off the
    // track, as a control must - in both themes.
    const white = hexOfToken.get("nyoki-white")!;
    const night = hexOfToken.get("nyoki-night")!;
    expect(contrastRatio(hexOfToken.get(on!)!, white)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(hexOfToken.get(darkOn!)!, night)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(hexOfToken.get(darkOn!)!, hexOfToken.get(darkKnobOn!)!)).toBeGreaterThanOrEqual(3);

    // Off, navy faded only so far that the track is still seen on white.
    expect(ui.toggle).toMatch(/(?:^|\s)bg-nyoki-navy\/(?:[6-9]\d)\b/);
    expect(ui.toggle).toMatch(/\bdark:bg-nyoki-night-rule\b/);
    expect(ui.toggle).not.toMatch(/nyoki-ink/);
  });

  it("dims the page behind a modal with a neutral scrim, never a brand tint", () => {
    // Ink is #0b063c - a saturated blue-purple. At any opacity it lays a blue
    // wash over whatever is behind it, which is why the scrim is plain black.
    expect(ui.scrim).toMatch(/\bbackdrop:bg-black\/\d+\b/);
    expect(ui.scrim).not.toMatch(/nyoki-/);
  });

  it("pairs every dark surface with light text", () => {
    expect(ui.page).toMatch(/dark:bg-nyoki-night\b/);
    expect(ui.page).toMatch(/dark:text-nyoki-beige/);
    expect(ui.panel).toMatch(/dark:bg-nyoki-night-panel/);
    expect(ui.card).toMatch(/dark:bg-nyoki-night-panel/);
  });

  it("never grounds a dark surface in the brand ink, which reads as blue", () => {
    for (const [name, classes] of Object.entries(ui)) {
      expect({ name, classes }).toMatchObject({ name });
      expect(classes).not.toMatch(/\bdark:bg-nyoki-ink\b/);
    }
  });

  it("draws dark rules in something visible against ink", () => {
    // An ink border on an ink ground is no border at all.
    expect(ui.rule).toMatch(/dark:border-nyoki-night-rule/);
  });

  it("puts the text of every recipe that sets both onto an approved ground", () => {
    for (const [name, classes] of Object.entries(ui)) {
      const bg = /(?:^|\s|:)bg-(nyoki-[a-z-]+)/.exec(classes)?.[1];
      const text = /(?:^|\s|:)text-(nyoki-[a-z-]+)/.exec(classes)?.[1];
      if (!bg || !text) continue;

      expect({ name, pairing: `${hexOfToken.get(text)} on ${hexOfToken.get(bg)}` }).toMatchObject({ name });
      expect(approved).toContain(`${hexOfToken.get(text)} on ${hexOfToken.get(bg)}`);
    }
  });

  it("gives the storefront a quiet band as well as the sage one", () => {
    // A category page opens on a band; sage on every one of them would shout.
    expect(ui.shopBandQuiet).toMatch(/\bbg-nyoki-accent-beige\b/);
    expect(ui.shopBandQuiet).toMatch(/\btext-nyoki-navy\b/);
  });

  it("lifts a table row under the pointer, onto a ground its text still reads on", () => {
    // Six tables share this recipe, so the hover belongs here rather than
    // being remembered separately on each of them.
    const light = /(?:^|\s)hover:bg-(nyoki-[a-z-]+)/.exec(ui.tableRow)?.[1];
    const dark = /(?:^|\s)dark:hover:bg-(nyoki-[a-z-]+)/.exec(ui.tableRow)?.[1];

    expect({ light, dark }).toMatchObject({ light: expect.any(String), dark: expect.any(String) });

    // A row carries the page's own text: navy in light, beige in dark.
    expect(approved).toContain(`${hexOfToken.get("nyoki-navy")} on ${hexOfToken.get(light!)}`);
    expect(approved).toContain(`${hexOfToken.get("nyoki-beige")} on ${hexOfToken.get(dark!)}`);
  });

  it("gives the shop an accent heading in the logo's sage, deepened so it reads on the page", () => {
    expect(ui.shopAccent).toMatch(/\btext-nyoki-sage-deep\b/);
    expect(approved).toContain(`${hexOfToken.get("nyoki-sage-deep")} on ${hexOfToken.get("nyoki-beige")}`);
  });

  it("puts a home page tile's words on its photo in white, over a neutral fade", () => {
    // A photograph is no approved ground, so the words carry their own: a
    // fade to black at the foot of the tile. Plain black, as the modal scrim
    // is, because every brand colour would tint the photo.
    expect(ui.shopTileLabel).toMatch(/\btext-nyoki-white\b/);
    expect(ui.shopTileFade).toMatch(/\bfrom-black\/\d+\b/);
    expect(ui.shopTileFade).not.toMatch(/nyoki-/);
    expect(ui.shopTileFadeLight).toMatch(/\bfrom-white\/\d+\b/);
    expect(ui.shopTileFadeLight).not.toMatch(/nyoki-/);
  });

  it("draws a tile with no photo in a pairing its words read on", () => {
    const bg = /\bbg-(nyoki-[a-z-]+)/.exec(ui.shopTilePlain)?.[1];
    const text = /\btext-(nyoki-[a-z-]+)/.exec(ui.shopTilePlain)?.[1];

    expect(approved).toContain(`${hexOfToken.get(text!)} on ${hexOfToken.get(bg!)}`);
  });

  it("nothing ever puts white or navy text on sage", () => {
    for (const classes of Object.values(ui)) {
      const onSage = /\bbg-nyoki-sage\b/.test(classes);
      if (!onSage) continue;
      expect(classes).not.toMatch(/\btext-nyoki-white\b/);
      expect(classes).not.toMatch(/\btext-nyoki-navy\b/);
    }
  });
});
