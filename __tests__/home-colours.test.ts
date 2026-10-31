import { contrastRatio } from "@/lib/brand/contrast";
import { APPROVED_LARGE_TEXT_PAIRINGS, APPROVED_TEXT_PAIRINGS, palette } from "@/lib/brand/palette";
import { ui } from "@/lib/brand/ui";
import {
  bannerGrounds,
  bannerInks,
  bannerStyle,
  DEFAULT_BANNER,
  DEFAULT_TILE_WORDS,
  inkFor,
  readsOn,
  TILE_WORDS,
  tileWords,
} from "@/lib/home/colours";

const hexOf = new Map(palette.map((entry) => [entry.token, entry.hex]));
const approved = new Set([...APPROVED_TEXT_PAIRINGS, ...APPROVED_LARGE_TEXT_PAIRINGS].map((p) => `${p.text} on ${p.surface}`));

describe("the banner's colours", () => {
  it("offers only the brand's own colours as the ground", () => {
    for (const ground of bannerGrounds()) expect(hexOf.get(ground.token)).toBe(ground.hex);
  });

  it("never offers the page's own beige, which would leave no band to see", () => {
    expect(bannerGrounds().map((ground) => ground.token)).not.toContain("nyoki-beige");
  });

  it("offers words for every ground in an approved pairing only", () => {
    for (const ground of bannerGrounds()) {
      const inks = bannerInks(ground.token);
      expect(inks.length).toBeGreaterThan(0);
      for (const ink of inks) expect(approved).toContain(`${ink.hex} on ${ground.hex}`);
    }
  });

  it("offers only ink on sage: white and navy both fail there", () => {
    expect(bannerInks("nyoki-sage").map((ink) => ink.token)).toEqual(["nyoki-ink"]);
  });

  it("never offers the wordmark's sage-light as words, which is decorative only", () => {
    for (const ground of bannerGrounds()) {
      expect(bannerInks(ground.token).map((ink) => ink.token)).not.toContain("nyoki-sage-light");
    }
  });

  it("starts as designed: ink on sage", () => {
    expect(DEFAULT_BANNER).toEqual({ ground: "nyoki-sage", ink: "nyoki-ink" });
  });

  it("knows which words read on which ground", () => {
    expect(readsOn("nyoki-navy", "nyoki-beige")).toBe(true);
    expect(readsOn("nyoki-sage", "nyoki-white")).toBe(false);
    expect(readsOn("nyoki-beige", "nyoki-ink")).toBe(false);
  });

  it("keeps the words when a new ground takes them, and takes the first that reads when not", () => {
    expect(inkFor("nyoki-white", "nyoki-ink")).toBe("nyoki-ink");
    expect(inkFor("nyoki-navy", "nyoki-ink")).toBe(bannerInks("nyoki-navy")[0].token);
  });

  it("draws the colours chosen", () => {
    expect(bannerStyle("nyoki-navy", "nyoki-beige")).toEqual({ backgroundColor: hexOf.get("nyoki-navy"), color: hexOf.get("nyoki-beige") });
  });

  it("draws the design's colours for a pair that does not read, rather than unreadable words", () => {
    expect(bannerStyle("nyoki-sage", "nyoki-white")).toEqual(bannerStyle(DEFAULT_BANNER.ground, DEFAULT_BANNER.ink));
  });
});

describe("a tile's words", () => {
  it("are white to begin with, as designed", () => {
    expect(DEFAULT_TILE_WORDS).toBe("nyoki-white");
  });

  it("sit light words on a dark fade and dark words on a light one, each readable against its fade", () => {
    for (const words of TILE_WORDS) {
      const against = words.fade === "dark" ? "#000000" : "#ffffff";
      expect({ words: words.token, ratio: contrastRatio(hexOf.get(words.token)!, against) }).toMatchObject({ words: words.token });
      expect(contrastRatio(hexOf.get(words.token)!, against)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("each draw in a recipe of their own colour, over a neutral fade", () => {
    for (const words of TILE_WORDS) {
      const { label, fade } = tileWords(words.token);
      expect(label).toMatch(new RegExp(`\\btext-${words.token}\\b`));
      expect(fade).not.toMatch(/nyoki-/);
      expect(fade).toBe(words.fade === "dark" ? ui.shopTileFade : ui.shopTileFadeLight);
    }
  });

  it("fall back to white for a colour no longer offered", () => {
    expect(tileWords("nyoki-sage-light")).toEqual(tileWords(DEFAULT_TILE_WORDS));
  });
});
