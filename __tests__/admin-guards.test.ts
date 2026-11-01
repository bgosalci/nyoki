import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every page, layout and route handler of the CMS checks the account itself.
 *
 * The protected layout's check is not enough on its own: moving between admin
 * pages renders only the page that changed, never the layout above it, so a
 * page that relied on the layout answered anyone holding a validly signed
 * cookie - an account removed since included, for up to the cookie's seven
 * days. Found by replaying a client-side navigation with such a cookie: the
 * orders list came back with every customer's email.
 */

const ROOT = join(__dirname, "..", "src", "app", "admin", "(protected)");
const ENTRY = /^(page|layout|route)\.tsx?$/;

function entries(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return entries(path);
    return ENTRY.test(item.name) ? [path] : [];
  });
}

const files = entries(ROOT).map((path) => [relative(ROOT, path), readFileSync(path, "utf8")] as const);

describe("the CMS's pages", () => {
  it("are all found", () => {
    expect(files.length).toBeGreaterThan(25);
  });

  it.each(files)("%s checks the account itself", (_, source) => {
    expect(source).toMatch(/await require(Admin|Owner)\(\)/);
  });
});
