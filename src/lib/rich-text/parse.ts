import { paragraphs } from "@/lib/storefront/paragraphs";

/**
 * The formatting the CMS can store in a description or materials: a small,
 * fixed piece of Markdown, kept as plain text so the CSV export and import
 * carry it unchanged, and so text saved before formatting existed reads
 * exactly as it did.
 *
 *   **bold**   *italic*   ***both***
 *   - a bullet (or * or •), one per line
 *   \* a literal asterisk, \\ a backslash, \- a dash that is not a bullet
 *
 * A blank line starts a paragraph; a single line break stays a line break.
 */

/** A run of text with one set of formatting. */
export interface Span {
  text: string;
  bold: boolean;
  italic: boolean;
}

/** One line of a paragraph or bullet; a line break separates two. */
export type Line = Span[];

export type Block = { type: "paragraph"; lines: Line[] } | { type: "list"; items: Line[][] };

const BULLET = /^\s*[-*•]\s+(.*)$/;
const ESCAPABLE = new Set(["\\", "*", "-", "•"]);

interface Token {
  /** Text, or a run of asterisks that may turn out to be formatting. */
  text: string;
  delimiter: boolean;
  /** Asterisks of the run not yet used as markers. */
  count: number;
  /** How long the run was to begin with. */
  length: number;
  canOpen: boolean;
  canClose: boolean;
  bold: boolean;
  italic: boolean;
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let text = "";
  const flush = () => {
    if (text) tokens.push({ text, delimiter: false, count: 0, length: 0, canOpen: false, canClose: false, bold: false, italic: false });
    text = "";
  };

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\\" && ESCAPABLE.has(line[i + 1])) {
      text += line[++i];
    } else if (char === "*") {
      let end = i;
      while (line[end] === "*") end++;
      const before = line[i - 1];
      const after = line[end];
      flush();
      tokens.push({
        text: "",
        delimiter: true,
        count: end - i,
        length: end - i,
        // A marker hugs its text: "5 * 3" is arithmetic, not emphasis.
        canOpen: after !== undefined && !/\s/.test(after),
        canClose: before !== undefined && !/\s/.test(before),
        bold: false,
        italic: false,
      });
      i = end - 1;
    } else {
      text += char;
    }
  }
  flush();
  return tokens;
}

/**
 * CommonMark's rule of three, which is what lets "**a*b***" read as bold "a"
 * then bold italic "b" rather than an italic "a" and stray asterisks.
 */
function blockedByRuleOfThree(opener: Token, closer: Token): boolean {
  const eitherBoth = opener.canClose || closer.canOpen;
  return eitherBoth && (opener.length + closer.length) % 3 === 0 && !(opener.length % 3 === 0 && closer.length % 3 === 0);
}

/** One line's text and formatting, with the markers taken out. */
function parseLine(line: string): Line {
  const tokens = tokenize(line.trim());

  for (let c = 0; c < tokens.length; c++) {
    const closer = tokens[c];
    if (!closer.delimiter || !closer.canClose) continue;

    let o = c - 1;
    while (closer.count > 0 && o >= 0) {
      const opener = tokens[o];
      if (!opener.delimiter || !opener.canOpen || opener.count === 0 || blockedByRuleOfThree(opener, closer)) {
        o--;
        continue;
      }
      const use = opener.count >= 2 && closer.count >= 2 ? 2 : 1;
      for (let k = o + 1; k < c; k++) {
        if (use === 2) tokens[k].bold = true;
        else tokens[k].italic = true;
        // Anything left open inside a pair that has closed stays as text.
        if (tokens[k].delimiter) tokens[k].canOpen = false;
      }
      opener.count -= use;
      closer.count -= use;
    }
  }

  const spans: Span[] = [];
  for (const token of tokens) {
    const text = token.delimiter ? "*".repeat(token.count) : token.text;
    if (!text) continue;
    const last = spans[spans.length - 1];
    if (last && last.bold === token.bold && last.italic === token.italic) last.text += text;
    else spans.push({ text, bold: token.bold, italic: token.italic });
  }
  return spans;
}

/** The paragraphs and lists in one stretch of text between blank lines. */
function parseBlock(block: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: Line[] | null = null;
  let list: Line[][] | null = null;

  for (const raw of block.split("\n")) {
    const bullet = BULLET.exec(raw);
    if (bullet) {
      paragraph = null;
      if (!list) blocks.push({ type: "list", items: (list = []) });
      list.push([parseLine(bullet[1])]);
    } else if (list && /^\s/.test(raw)) {
      // Indented under a bullet: the same bullet, on a new line.
      list[list.length - 1].push(parseLine(raw));
    } else {
      list = null;
      if (!paragraph) blocks.push({ type: "paragraph", lines: (paragraph = []) });
      paragraph.push(parseLine(raw));
    }
  }

  return blocks.flatMap((found): Block[] => {
    if (found.type === "paragraph") {
      const lines = found.lines.filter((line) => line.length > 0);
      return lines.length > 0 ? [{ type: "paragraph", lines }] : [];
    }
    const items = found.items.map((item) => item.filter((line) => line.length > 0)).filter((item) => item.length > 0);
    return items.length > 0 ? [{ type: "list", items }] : [];
  });
}

export function parseRichText(text: string): Block[] {
  return paragraphs(text).flatMap(parseBlock);
}

const plainLine = (line: Line) => line.map((span) => span.text).join("");

/** The first paragraph as plain words, for a page's meta description. */
export function summaryOf(text: string): string | undefined {
  const [first] = parseRichText(text);
  if (!first) return undefined;
  return first.type === "paragraph"
    ? first.lines.map(plainLine).join(" ")
    : first.items.map((item) => item.map(plainLine).join(" ")).join(", ");
}
