/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Characters that are invisible, or not characters at all, belong in source
 * only as escapes (\uFEFF), never as themselves: pasted in, they cannot be
 * seen in review and silently change what a string or pattern means. This
 * happened three times while writing the CSV and XML code.
 */
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\u2060\uFEFF\uFFFE\uFFFF]/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "generated" ? [] : files(path);
    return /\.(ts|tsx|css|md)$/.test(name) ? [path] : [];
  });
}

describe("source files", () => {
  it.each(["src", "__tests__", "scripts"])("in %s hold no invisible characters, only escapes", (dir) => {
    const offenders = files(join(process.cwd(), dir)).filter((path) => INVISIBLE.test(readFileSync(path, "utf8")));

    expect(offenders).toEqual([]);
  });
});
