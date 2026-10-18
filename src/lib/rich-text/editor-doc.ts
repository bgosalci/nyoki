import { parseRichText, type Line } from "@/lib/rich-text/parse";

/**
 * The CMS's formatted text (see parse.ts) to and from the editor's document,
 * the JSON Tiptap works in. Only the parts read or written here are typed.
 */
export interface EditorNode {
  type?: string;
  text?: string;
  marks?: { type: string }[];
  content?: EditorNode[];
}

type Mark = "bold" | "italic";

const MARKER: Record<Mark, string> = { bold: "**", italic: "*" };
/** Opened in this order, so text that is both always reads ***like this***. */
const MARKS: Mark[] = ["bold", "italic"];

function lineNodes(lines: Line[]): EditorNode[] {
  return lines.flatMap((line, i) => [
    ...(i > 0 ? [{ type: "hardBreak" }] : []),
    ...line.map((span): EditorNode => {
      const marks = MARKS.filter((mark) => span[mark]).map((type) => ({ type }));
      return marks.length > 0 ? { type: "text", text: span.text, marks } : { type: "text", text: span.text };
    }),
  ]);
}

function paragraphNode(lines: Line[]): EditorNode {
  const content = lineNodes(lines);
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
}

export function toEditorDoc(text: string): EditorNode {
  const content = parseRichText(text).map(
    (block): EditorNode =>
      block.type === "paragraph"
        ? paragraphNode(block.lines)
        : { type: "bulletList", content: block.items.map((item) => ({ type: "listItem", content: [paragraphNode(item)] })) },
  );
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

interface Run {
  text: string;
  marks: Mark[];
}

/** A paragraph's text runs, split into lines at its hard breaks. */
function linesOf(paragraph: EditorNode): Run[][] {
  const lines: Run[][] = [[]];
  for (const node of paragraph.content ?? []) {
    if (node.type === "hardBreak") lines.push([]);
    else if (node.type === "text" && node.text) {
      lines[lines.length - 1].push({ text: node.text, marks: MARKS.filter((mark) => node.marks?.some((m) => m.type === mark)) });
    }
  }
  return lines;
}

const escapeText = (text: string) => text.replace(/[\\*]/g, "\\$&");

function writeLine(runs: Run[]): string {
  let out = "";
  const open: Mark[] = [];

  // A marker has to touch its text to count as one, so spaces at the edge of
  // formatted text go outside the markers: "**bold** text", not "**bold **text".
  const close = (count: number) => {
    const trailing = /\s*$/.exec(out)![0];
    out = out.slice(0, out.length - trailing.length);
    for (let i = 0; i < count; i++) out += MARKER[open.pop()!];
    out += trailing;
  };

  for (const run of runs) {
    // Spaces alone are never worth opening a marker for.
    const marks = run.text.trim() === "" ? run.marks.filter((mark) => open.includes(mark)) : run.marks;
    const firstEnding = open.findIndex((mark) => !marks.includes(mark));
    if (firstEnding !== -1) close(open.length - firstEnding);

    const leading = /^\s*/.exec(run.text)![0];
    out += leading;
    for (const mark of marks) {
      if (open.includes(mark)) continue;
      out += MARKER[mark];
      open.push(mark);
    }
    out += escapeText(run.text.slice(leading.length));
  }
  close(open.length);

  // Typed at the start of a line, "- " would come back as a bullet.
  return out.trim().replace(/^([-•])(\s)/, "\\$1$2");
}

function writeParagraph(paragraph: EditorNode): string {
  return linesOf(paragraph).map(writeLine).join("\n").trim();
}

function writeList(list: EditorNode): string {
  return (list.content ?? [])
    .map((item) =>
      (item.content ?? [])
        .filter((node) => node.type === "paragraph")
        .flatMap(linesOf)
        .map(writeLine)
        .filter((line) => line.length > 0),
    )
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.map((line, i) => (i === 0 ? `- ${line}` : `  ${line}`)).join("\n"))
    .join("\n");
}

export function fromEditorDoc(doc: EditorNode): string {
  return (doc.content ?? [])
    .map((node) => (node.type === "bulletList" ? writeList(node) : node.type === "paragraph" ? writeParagraph(node) : ""))
    .filter((block) => block.length > 0)
    .join("\n\n");
}
