/**
 * Generate docs/brand/theme-board.html from the palette module.
 *
 *   pnpm brand:board
 *
 * The board is built from src/lib/brand/palette.ts and the contrast maths, so
 * every swatch, ratio and verdict on it is the same one the tests enforce.
 * Regenerate it whenever the palette changes.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { AA_LARGE_TEXT, AA_TEXT, contrastRatio } from "../src/lib/brand/contrast";
import {
  APPROVED_LARGE_TEXT_PAIRINGS,
  APPROVED_TEXT_PAIRINGS,
  brand,
  neutral,
  palette,
  type Pairing,
} from "../src/lib/brand/palette";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p));

const logoPng = read("public/brand/nyoki-logo-small.png").toString("base64");
const logoOnSagePng = read("public/brand/nyoki-logo-on-sage.png").toString("base64");
const moth = read("public/brand/moth.svg").toString("utf8").replace(/<\?xml[^>]*>\s*/, "").replace(/<title>.*?<\/title>\s*/, "");
const about = read("docs/brand/about.md").toString("utf8").trim().split(/\n\s*\n/);

const byHex = new Map(palette.map((entry) => [entry.hex, entry]));
const nameOf = (hex: string) => byHex.get(hex)?.name ?? hex;
const ratio = (p: Pairing) => contrastRatio(p.text, p.surface);
const fmt = (n: number) => `${n.toFixed(2)}:1`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function swatch(hex: string, large: boolean): string {
  const e = byHex.get(hex)!;
  const onWhite = contrastRatio(hex, neutral.white);
  return `
    <li class="swatch ${large ? "swatch--large" : ""}">
      <div class="swatch__chip" style="background:${hex}"></div>
      <div class="swatch__meta">
        <p class="swatch__name">${esc(e.name)} <span class="role role--${e.role}">${e.role}</span></p>
        <p class="mono">${hex} · <span title="Tailwind token">${e.token}</span></p>
        <p class="swatch__note">${esc(e.note)}</p>
        <p class="swatch__source">from ${e.source} · ${fmt(onWhite)} on white</p>
      </div>
    </li>`;
}

function pairingChip(p: Pairing, threshold: number): string {
  const r = ratio(p);
  const verdict = r >= AA_TEXT ? "AA" : r >= AA_LARGE_TEXT ? "AA large" : "fails";
  return `
    <li class="pair" style="background:${p.surface};color:${p.text}">
      <p class="pair__sample">${esc(nameOf(p.text))} on ${esc(nameOf(p.surface))}</p>
      <p class="pair__use">${esc(p.use)}</p>
      <p class="pair__ratio mono">${fmt(r)} <span class="verdict ${r >= threshold ? "verdict--ok" : "verdict--no"}">${verdict}</span></p>
    </li>`;
}

const doNot: Pairing[] = [
  { text: neutral.white, surface: brand.sage, use: "The logo does this — a wordmark can, small text cannot" },
  { text: brand.navy, surface: brand.sage, use: "Both brand colours together, and neither reads" },
  { text: brand.sageLight, surface: neutral.white, use: "The script colour as copy" },
  { text: brand.sage, surface: neutral.beige, use: "Sage as a text colour" },
];

const html = `<title>Nyoki Theme Board</title>
<meta name="description" content="The Nyoki Handmade palette, read from the logo files, with the text pairings that pass and the ones that don't.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
  :root {
    --ground: ${neutral.beige};
    --panel: ${neutral.accentBeige};
    --rule: ${neutral.lightSlate};
    --text: ${brand.navy};
    --text-soft: ${neutral.textDark};
    --heading: ${brand.ink};
    --ok: #2f6b4f;
    --no: #8a3b2e;
    --font-display: "Jost", "Futura", "Avenir Next", "Helvetica Neue", Arial, sans-serif;
    --font-body: "Source Sans 3", "Source Sans Pro", "Segoe UI", system-ui, sans-serif;
    --font-mono: "IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #171b21; --panel: #1f242c; --rule: #313842;
      --text: ${neutral.blueGrey}; --text-soft: ${neutral.softAsh}; --heading: ${neutral.beige};
      --ok: #7fc8a4; --no: #e0907f;
    }
  }
  :root[data-theme="dark"] {
    --ground: #171b21; --panel: #1f242c; --rule: #313842;
    --text: ${neutral.blueGrey}; --text-soft: ${neutral.softAsh}; --heading: ${neutral.beige};
    --ok: #7fc8a4; --no: #e0907f;
  }
  body { background: var(--ground); color: var(--text); font-family: var(--font-body); font-size: 17px; line-height: 1.55; padding-inline: clamp(16px, 4vw, 40px); padding-block: 0 80px; }
  .wrap { max-width: 1040px; margin: 0 auto; }
  h1, h2, h3 { font-family: var(--font-display); color: var(--heading); text-wrap: balance; margin: 0; }
  h1 { font-size: clamp(2rem, 5vw, 3rem); font-weight: 600; letter-spacing: -0.01em; line-height: 1.1; }
  h2 { font-size: 1.5rem; font-weight: 600; }
  h3 { font-size: 1.05rem; font-weight: 600; }
  p { margin: 0; }
  .eyebrow { font-family: var(--font-display); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text); opacity: .75; }
  .mono { font-family: var(--font-mono); font-size: 0.82rem; font-variant-numeric: tabular-nums; }
  .lede { max-width: 62ch; color: var(--text-soft); font-size: 1.1rem; }
  section { padding-block: 56px; border-top: 1px solid var(--rule); display: grid; gap: 22px; }
  section:first-of-type { border-top: 0; padding-top: 48px; }
  .section-head { display: grid; gap: 6px; }
  .section-head p { max-width: 62ch; color: var(--text-soft); }

  .marks { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
  .mark { display: grid; place-items: center; aspect-ratio: 16 / 10; max-width: 100%; border-radius: 6px; padding: 24px; }
  .mark img { width: min(100%, 260px); height: auto; }
  .mark--white { background: ${neutral.white}; border: 1px solid var(--rule); }
  .mark--sage { background: ${brand.sage}; }
  .mark--moth { background: var(--panel); }
  .mark--moth svg { width: 30%; height: auto; fill: ${brand.ink}; }
  .mark__caption { grid-column: 1 / -1; color: var(--text-soft); font-size: .95rem; }

  .swatches { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 16px; }
  .swatches--brand { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .swatch { display: grid; gap: 10px; align-content: start; }
  .swatch__chip { aspect-ratio: 4 / 3; max-width: 100%; border-radius: 6px; border: 1px solid var(--rule); }
  .swatch--large .swatch__chip { aspect-ratio: 3 / 2; }
  .swatch__meta { display: grid; gap: 4px; }
  .swatch__name { font-family: var(--font-display); font-weight: 600; color: var(--heading); display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .swatch__note { color: var(--text-soft); font-size: .9rem; }
  .swatch__source { color: var(--text-soft); font-size: .78rem; opacity: .8; }
  .role { font-family: var(--font-display); font-size: .62rem; letter-spacing: .12em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; background: var(--panel); color: var(--text); font-weight: 600; }

  .pairs { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
  .pair { border-radius: 6px; padding: 16px 16px 14px; display: grid; gap: 4px; align-content: start; border: 1px solid rgba(0,0,0,.08); }
  .pair__sample { font-family: var(--font-display); font-weight: 600; font-size: 1.05rem; }
  .pair__use { font-size: .9rem; opacity: .9; }
  .pair__ratio { margin-top: 6px; display: flex; align-items: center; gap: 8px; }
  .pairs--large .pair__sample { font-size: 1.45rem; }
  .pairs--large .pair__use { font-size: 1.1rem; }
  .verdict { font-family: var(--font-display); font-size: .62rem; letter-spacing: .12em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; font-weight: 600; }
  .verdict--ok { background: rgba(255,255,255,.55); color: #1f4d38; }
  .verdict--no { background: rgba(255,255,255,.7); color: #7a2a1e; }
  .pair--bad { position: relative; }
  .pair--bad::after { content: ""; position: absolute; inset: 0; border-radius: 6px; border: 2px dashed rgba(122,42,30,.55); pointer-events: none; }

  .components { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; align-items: start; }
  .demo { background: ${neutral.beige}; border: 1px solid ${neutral.lightSlate}; border-radius: 8px; padding: 20px; display: grid; gap: 14px; color: ${brand.navy}; font-family: var(--font-body); }
  .demo h3 { color: ${brand.ink}; }
  .btn { font-family: var(--font-display); font-weight: 600; font-size: .95rem; letter-spacing: .02em; padding: 11px 18px; border-radius: 4px; border: 1.5px solid transparent; display: inline-block; text-align: center; }
  .btn--primary { background: ${brand.navy}; color: ${neutral.beige}; }
  .btn--secondary { background: transparent; color: ${brand.navy}; border-color: ${brand.navy}; }
  .btn--sage { background: ${brand.sage}; color: ${brand.ink}; }
  .btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .card { background: ${neutral.white}; border: 1px solid ${neutral.lightSlate}; border-radius: 8px; overflow: hidden; display: grid; }
  .card__img { aspect-ratio: 1; max-width: 100%; background: ${neutral.softAsh}; display: grid; place-items: center; color: ${brand.navy}; font-size: .85rem; }
  .card__body { padding: 14px 16px 16px; display: grid; gap: 6px; }
  .card__name { font-family: var(--font-display); font-weight: 600; color: ${brand.ink}; font-size: 1.1rem; }
  .price { font-family: var(--font-mono); font-variant-numeric: tabular-nums; display: flex; gap: 10px; align-items: baseline; }
  .price s { color: ${neutral.textDark}; opacity: .7; }
  .tag { font-family: var(--font-display); font-size: .66rem; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; padding: 3px 8px; border-radius: 3px; display: inline-block; }
  .tag--sale { background: ${brand.sage}; color: ${brand.ink}; }
  .tag--made { background: ${neutral.accentBeige}; color: ${brand.navy}; }
  .tag--one { background: ${brand.ink}; color: ${neutral.beige}; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .band { background: ${brand.sage}; color: ${brand.ink}; border-radius: 6px; padding: 18px 20px; display: grid; gap: 4px; }
  .band .eyebrow { color: ${brand.ink}; opacity: .8; }
  .band h3 { color: ${brand.ink}; font-size: 1.3rem; }
  .footer-demo { background: ${brand.ink}; color: ${neutral.beige}; border-radius: 6px; padding: 18px 20px; display: grid; gap: 6px; }
  .footer-demo .eyebrow { color: ${neutral.blueGrey}; opacity: 1; }

  .voice { display: grid; gap: 18px; max-width: 66ch; }
  .voice h2 { font-size: clamp(1.6rem, 4vw, 2.2rem); }
  .voice p { color: var(--text-soft); font-size: 1.08rem; }
  .voice p em { font-style: italic; }
  .type-specimen { display: grid; gap: 10px; padding: 20px; background: var(--panel); border-radius: 8px; }
  .type-specimen .line { display: grid; grid-template-columns: 9ch 1fr; gap: 12px; align-items: baseline; }
  .type-specimen .line .mono { color: var(--text-soft); }
  .display-sample { font-family: var(--font-display); font-weight: 600; font-size: 1.6rem; color: var(--heading); }
  .body-sample { font-family: var(--font-body); }
  .mono-sample { font-family: var(--font-mono); }
  .where { display: grid; gap: 6px; color: var(--text-soft); font-size: .92rem; }
  .where code { font-family: var(--font-mono); font-size: .82rem; background: var(--panel); padding: 1px 5px; border-radius: 3px; }
  @media (prefers-reduced-motion: no-preference) { .pair, .swatch__chip { transition: transform .15s ease; } .pair:hover, .swatch__chip:hover { transform: translateY(-1px); } }
</style>

<div class="wrap">
  <section>
    <div class="section-head">
      <p class="eyebrow">Nyoki Handmade</p>
      <h1>Theme board</h1>
      <p class="lede">Every colour here was read out of the logo files — the sage from the SVG, the script and the HANDMADE caps from the pixels, the ink from the moth — and the neutrals are the palette that already existed. The pairings show what passes for text and what doesn't.</p>
    </div>
    <div class="marks">
      <div class="mark mark--white"><img src="data:image/png;base64,${logoPng}" alt="Nyoki Handmade wordmark: sage script with navy caps, on white" width="227" height="142"></div>
      <div class="mark mark--sage"><img src="data:image/png;base64,${logoOnSagePng}" alt="Nyoki Handmade wordmark in white on sage" width="207" height="140"></div>
      <div class="mark mark--moth" aria-label="The moth mark in ink">${moth}</div>
      <p class="mark__caption">Left to right: the wordmark on white (sage light + navy), the wordmark on sage (white), and the moth in ink. The moth is the only mark that is a true vector; the wordmark files are pixels, so keep them at or below their native size.</p>
    </div>
  </section>

  <section>
    <div class="section-head">
      <p class="eyebrow">Colours</p>
      <h2>Four brand colours, seven neutrals</h2>
      <p>The ratio under each swatch is its contrast against white. Anything under 3:1 is decoration, not text.</p>
    </div>
    <ul class="swatches swatches--brand">
      ${[brand.sage, brand.sageLight, brand.navy, brand.ink].map((hex) => swatch(hex, true)).join("")}
    </ul>
    <ul class="swatches">
      ${[neutral.beige, neutral.accentBeige, neutral.softAsh, neutral.lightSlate, neutral.blueGrey, neutral.textDark, neutral.white].map((hex) => swatch(hex, false)).join("")}
    </ul>
  </section>

  <section>
    <div class="section-head">
      <p class="eyebrow">Pairings</p>
      <h2>Text on surface — what passes</h2>
      <p>These are the only combinations the site puts text in. Each meets WCAG AA for body text (${AA_TEXT}:1 or better). The tests in the repo check every one.</p>
    </div>
    <ul class="pairs">
      ${APPROVED_TEXT_PAIRINGS.map((p) => pairingChip(p, AA_TEXT)).join("")}
    </ul>
    <div class="section-head">
      <h3>Large text and labels only (${AA_LARGE_TEXT}:1)</h3>
      <p>Fine for headings from about 24px, tags and badges. Not for a paragraph.</p>
    </div>
    <ul class="pairs pairs--large">
      ${APPROVED_LARGE_TEXT_PAIRINGS.map((p) => pairingChip(p, AA_LARGE_TEXT)).join("")}
    </ul>
    <div class="section-head">
      <h3>The tempting ones that don't</h3>
      <p>The logo puts white on sage, so this is the first thing anyone reaches for on a button. It fails even the large-text minimum. On sage, use ink.</p>
    </div>
    <ul class="pairs">
      ${doNot.map((p) => pairingChip(p, AA_LARGE_TEXT).replace('class="pair"', 'class="pair pair--bad"')).join("")}
    </ul>
  </section>

  <section>
    <div class="section-head">
      <p class="eyebrow">Components</p>
      <h2>How the palette behaves in use</h2>
      <p>Samples only — the storefront design is still to be decided. What these settle is which colour does which job.</p>
    </div>
    <div class="components">
      <div class="demo">
        <h3>Buttons</h3>
        <div class="btn-row">
          <span class="btn btn--primary">Add to basket</span>
          <span class="btn btn--secondary">Keep browsing</span>
          <span class="btn btn--sage">On sale</span>
        </div>
        <p style="font-size:.9rem;color:${neutral.textDark}">Primary is beige on navy. The sage button carries ink text — the only text colour that reads on sage.</p>
      </div>
      <div class="demo">
        <h3>Product card</h3>
        <div class="card">
          <div class="card__img">photo · soft ash ground</div>
          <div class="card__body">
            <p class="card__name">Hand-thrown Stoneware Mug</p>
            <p class="price"><span>£19.20</span><s>£24.00</s></p>
            <div class="tags"><span class="tag tag--sale">20% off</span><span class="tag tag--made">Made to order · 14 days</span><span class="tag tag--one">One of a kind</span></div>
          </div>
        </div>
      </div>
      <div class="demo">
        <h3>Bands</h3>
        <div class="band">
          <p class="eyebrow">Free UK delivery</p>
          <h3>On orders over £40</h3>
        </div>
        <div class="footer-demo">
          <p class="eyebrow">Nyoki Handmade</p>
          <p>Made in the UK from UK-sourced materials. Biodegradable packaging, water-based adhesives.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <p class="eyebrow">Type</p>
      <h2>Three faces, three jobs</h2>
      <p>The wordmark pairs a hand script with geometric bold caps. Jost carries that geometry into headings; Source Sans 3 does the reading; Plex Mono handles prices and codes so digits line up.</p>
    </div>
    <div class="type-specimen">
      <div class="line"><span class="mono">display</span><span class="display-sample">Where tradition meets modern</span></div>
      <div class="line"><span class="mono">body</span><span class="body-sample">Raised in homes adorned with handcrafted treasures, we inherited a passion for craftsmanship from our mothers and grandmothers.</span></div>
      <div class="line"><span class="mono">mono</span><span class="mono-sample">£19.20 · SKU NYK-0142 · 4.41:1</span></div>
    </div>
  </section>

  <section>
    <div class="section-head">
      <p class="eyebrow">Voice</p>
    </div>
    <div class="voice">
      <h2>${esc(about[0])}</h2>
      ${about.slice(1).map((p) => `<p>${esc(p)}</p>`).join("\n      ")}
    </div>
  </section>

  <section>
    <div class="where">
      <p class="eyebrow">Where this lives</p>
      <p>Values: <code>src/lib/brand/palette.ts</code> · Contrast rules: <code>src/lib/brand/contrast.ts</code> · Tailwind tokens: <code>src/app/globals.css</code> (<code>bg-nyoki-sage</code>, <code>text-nyoki-navy</code>…) · Assets: <code>public/brand/</code></p>
      <p>This page is generated from those files by <code>pnpm brand:board</code>. Change the palette there and regenerate; don't edit the board by hand.</p>
    </div>
  </section>
</div>
`;

const out = join(root, "docs/brand/theme-board.html");
writeFileSync(out, html);
writeFileSync(join(root, "public/brand/theme-board.html"), html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB) and public/brand/theme-board.html`);
