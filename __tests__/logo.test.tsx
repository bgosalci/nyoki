import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { inflateSync } from "node:zlib";

import { render, screen } from "@testing-library/react";

import CheckoutLayout from "@/app/(checkout)/layout";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { ShopLogo } from "@/components/shop/shop-logo";
import { LOGO, LOGO_ON_SAGE, LOGO_SMALL, type LogoFile } from "@/lib/brand/logo";

jest.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

const root = process.cwd();
const bytesOf = (logo: LogoFile) => readFileSync(join(root, "public", logo.src));

/** The PNG header, and the first pixel - which no PNG row filter changes. */
function readPng(logo: LogoFile) {
  const bytes = bytesOf(logo);
  const idat: Buffer[] = [];
  for (let at = 8; at < bytes.length; ) {
    const length = bytes.readUInt32BE(at);
    if (bytes.toString("latin1", at + 4, at + 8) === "IDAT") idat.push(bytes.subarray(at + 8, at + 8 + length));
    at += length + 12;
  }
  const pixels = inflateSync(Buffer.concat(idat));
  return {
    signature: bytes.subarray(0, 8).toString("hex"),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    bitDepth: bytes[24],
    colourType: bytes[25],
    // Each row starts with its filter byte; then red, green, blue, alpha.
    firstPixelAlpha: pixels[4],
  };
}

const drawn = (name: string) => decodeURIComponent(screen.getByRole("img", { name }).getAttribute("src") ?? "");

describe("the logo", () => {
  it.each([
    ["the logo", LOGO],
    ["the small logo", LOGO_SMALL],
    ["the logo on sage", LOGO_ON_SAGE],
  ])("draws %s from a PNG exactly the size the pages are told", (_, logo) => {
    // next/image takes its shape from width and height; told wrongly, the
    // mark is squashed or the header jumps as it loads.
    const png = readPng(logo);

    expect(png.signature).toBe("89504e470d0a1a0a");
    expect([png.width, png.height]).toEqual([logo.width, logo.height]);
  });

  it.each([
    ["the logo", LOGO],
    ["the small logo", LOGO_SMALL],
  ])("cuts %s out onto a see-through ground, so it sits on the page rather than in a white box", (_, logo) => {
    // It came on white. The shop's ground is beige and the admin's can be
    // near-black.
    const png = readPng(logo);

    expect(png.colourType).toBe(6);
    expect(png.bitDepth).toBe(8);
    expect(png.firstPixelAlpha).toBe(0);
  });

  it("is the one in the shop's header", () => {
    render(<ShopLogo />);

    expect(drawn("Nyoki Handmade")).toContain(`url=${LOGO.src}`);
  });

  it("is the one at checkout", () => {
    render(<CheckoutLayout>{null}</CheckoutLayout>);

    expect(drawn("Nyoki Handmade")).toContain(`url=${LOGO.src}`);
  });

  it("is the one in the admin's top bar, in its small size", () => {
    render(<AdminTopBar />);

    expect(drawn("Nyoki Handmade")).toContain(`url=${LOGO_SMALL.src}`);
  });

  it("is named only in src/lib/brand/logo.ts, so nothing can still draw an old one", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return name === "generated" ? [] : files(path);
        return /\.(ts|tsx|css)$/.test(name) ? [path] : [];
      });
    const naming = [...files(join(root, "src")), ...files(join(root, "scripts"))]
      .filter((path) => /\/brand\/[\w./-]*logo[\w.-]*\.(png|svg|webp|jpe?g)/.test(readFileSync(path, "utf8")))
      .map((path) => relative(root, path));

    expect(naming).toEqual(["src/lib/brand/logo.ts"]);
  });

  it("is the one on the brand board", () => {
    // pnpm brand:board embeds the files; this fails until it is run again.
    const board = readFileSync(join(root, "docs/brand/theme-board.html"), "utf8");

    expect(board).toContain(bytesOf(LOGO_SMALL).toString("base64"));
    expect(board).toContain(bytesOf(LOGO_ON_SAGE).toString("base64"));
  });
});
