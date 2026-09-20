/**
 * @jest-environment node
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { palette } from "@/lib/brand/palette";

// The CSS tokens are hand-written in globals.css; this pins them to the
// palette module so the two cannot drift apart.
describe("Tailwind brand tokens", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it.each(palette.map((entry) => [entry.token, entry.hex]))(
    "--color-%s is %s",
    (token, hex) => {
      expect(css).toMatch(new RegExp(`--color-${token}:\\s*${hex};`));
    },
  );

  it("declares no nyoki token that the palette does not know", () => {
    const declared = [...css.matchAll(/--color-(nyoki-[a-z-]+):/g)].map((m) => m[1]);
    const known = palette.map((entry) => entry.token);
    expect(declared.sort()).toEqual(known.sort());
  });
});
