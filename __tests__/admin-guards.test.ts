import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Every page, layout and route handler of the CMS checks the account itself,
 * before it does anything else.
 *
 * The protected layout's check is not enough on its own: moving between admin
 * pages renders only the page that changed, never the layout above it, so a
 * page that relied on the layout answered anyone holding a validly signed
 * cookie - an account removed since included, for up to the cookie's seven
 * days. Found by replaying a client-side navigation with such a cookie: the
 * orders list came back with every customer's email.
 *
 * First, not merely somewhere: a page that starts its queries and checks
 * afterwards, or a check left only in a comment, would pass a search of the
 * file and still hand the data over.
 */

const ROOT = join(__dirname, "..", "src", "app", "admin", "(protected)");
const ENTRY = /^(page|layout|route)\.tsx?$/;
const GUARD = /^(const \w+ = |const \{[^}]*\} = )?await require(Admin|Owner)\(\);/;

function entries(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return entries(path);
    return ENTRY.test(item.name) ? [path] : [];
  });
}

/** Comments out, so a guard written only in one cannot count. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/**
 * The first statement of each function the file exports: the page or layout
 * (`export default`), or each method of a route handler (`export async
 * function GET`). Its parameter list is skipped by counting brackets, since a
 * page's destructured props hold braces of their own.
 */
function firstStatements(source: string): string[] {
  const code = withoutComments(source);
  const starts = [...code.matchAll(/export (?:default )?(?:async )?function \w*\s*\(/g)].map((match) => match.index! + match[0].length - 1);
  return starts.map((open) => {
    let depth = 0;
    let at = open;
    for (; at < code.length; at++) {
      if (code[at] === "(") depth++;
      else if (code[at] === ")" && --depth === 0) break;
    }
    const body = code.indexOf("{", at) + 1;
    return code.slice(body).trimStart();
  });
}

const files = entries(ROOT).map((path) => [relative(ROOT, path), readFileSync(path, "utf8")] as const);

describe("the CMS's pages", () => {
  it("are all found", () => {
    expect(files.length).toBeGreaterThan(25);
  });

  it.each(files)("%s checks the account before anything else", (_, source) => {
    const statements = firstStatements(source);

    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) expect(statement).toMatch(GUARD);
  });
});

describe("the check for it", () => {
  const page = (body: string) => `export default async function Page({ params }: { params: Promise<{ id: string }> }) {\n${body}\n}`;

  it("passes a page that checks first", () => {
    expect(firstStatements(page("  // why\n  await requireAdmin();\n  const x = 1;"))[0]).toMatch(GUARD);
  });

  it("fails a page that fetches first and checks after", () => {
    expect(firstStatements(page("  const orders = await db.order.findMany();\n  await requireAdmin();"))[0]).not.toMatch(GUARD);
  });

  it("fails a check that is only in a comment", () => {
    expect(firstStatements(page("  // await requireAdmin();\n  const orders = await db.order.findMany();"))[0]).not.toMatch(GUARD);
  });
});
