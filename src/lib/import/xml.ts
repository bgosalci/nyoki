/** A file that cannot be read as XML, said in words a person can act on. */
export class XmlError extends Error {}

export interface XmlElement {
  name: string;
  attributes: Record<string, string>;
  children: XmlElement[];
  /** Its own text, CDATA included, entities decoded; whitespace between children too. */
  text: string;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const NAME = /[A-Za-z_:][\w.:-]*/y;

/**
 * Reads the XML the product export writes, and XML like it: elements,
 * attributes, text, the five entities and character references, CDATA,
 * comments and the <?xml?> declaration.
 *
 * A DOCTYPE is refused outright. It is how an XML file defines entities of
 * its own - one that expands into gigabytes ("billion laughs"), or one that
 * pulls in another file - and nothing a product list needs. A reader that
 * does not understand DTDs cannot be tricked by one; saying so is clearer
 * than reading past it.
 */
export function parseXml(input: string): XmlElement {
  const source = (input.startsWith("\uFEFF") ? input.slice(1) : input).replace(/\r\n?/g, "\n");
  const lineAt = (at: number) => source.slice(0, at).split("\n").length;
  const fail = (message: string, at: number): never => {
    throw new XmlError(`Line ${lineAt(at)}: ${message}`);
  };

  function decode(raw: string, at: number): string {
    let out = "";
    for (let i = 0; i < raw.length; i += 1) {
      if (raw[i] !== "&") {
        out += raw[i];
        continue;
      }
      const end = raw.indexOf(";", i);
      const ref = end < 0 ? "" : raw.slice(i + 1, end);
      if (end < 0 || end - i > 12 || /\s/.test(ref)) fail("an & on its own must be written as &amp;.", at + i);
      if (ref in ENTITIES) out += ENTITIES[ref];
      else if (/^#x[0-9a-f]+$/i.test(ref) || /^#\d+$/.test(ref)) {
        const code = ref[1].toLowerCase() === "x" ? Number.parseInt(ref.slice(2), 16) : Number.parseInt(ref.slice(1), 10);
        if (code > 0x10ffff) fail(`&${ref}; is not a character.`, at + i);
        out += String.fromCodePoint(code);
      } else fail(`&${ref}; is not an entity XML knows.`, at + i);
      i = end;
    }
    return out;
  }

  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  let i = 0;

  const skipSpace = (from: number) => {
    let at = from;
    while (at < source.length && /\s/.test(source[at])) at += 1;
    return at;
  };

  while (i < source.length) {
    if (source.startsWith("<!--", i)) {
      const end = source.indexOf("-->", i + 4);
      if (end < 0) fail("a comment is never closed.", i);
      i = end + 3;
    } else if (source.startsWith("<![CDATA[", i)) {
      const end = source.indexOf("]]>", i + 9);
      if (end < 0) fail("a CDATA section is never closed.", i);
      if (stack.length === 0) fail("there is text outside any element.", i);
      stack[stack.length - 1].text += source.slice(i + 9, end);
      i = end + 3;
    } else if (source.startsWith("<!", i)) {
      if (/^<!DOCTYPE/i.test(source.slice(i, i + 9))) throw new XmlError("The file declares a DOCTYPE, which is not read, for safety.");
      fail("a <! starts something that is not a comment or CDATA.", i);
    } else if (source.startsWith("<?", i)) {
      const end = source.indexOf("?>", i + 2);
      if (end < 0) fail("a <? declaration is never closed.", i);
      i = end + 2;
    } else if (source.startsWith("</", i)) {
      NAME.lastIndex = i + 2;
      const name = NAME.exec(source)?.[0];
      if (!name) fail("a closing tag has no name.", i);
      const close = skipSpace(i + 2 + name!.length);
      if (source[close] !== ">") fail(`</${name} is not closed with >.`, i);
      const open = stack.pop();
      if (!open) fail(`</${name}> closes nothing.`, i);
      if (open!.name !== name) fail(`</${name}> closes <${open!.name}>, which is still open.`, i);
      if (stack.length === 0) root = open!;
      i = close + 1;
    } else if (source[i] === "<") {
      NAME.lastIndex = i + 1;
      const name = NAME.exec(source)?.[0];
      if (!name) fail("a < starts something that is not a tag. Write it as &lt;.", i);
      // One outer element only: root is set once the first one closes.
      if (stack.length === 0 && root) fail(`there is more after the end of <${root.name}>.`, i);

      const element: XmlElement = { name: name!, attributes: {}, children: [], text: "" };
      let at = i + 1 + name!.length;
      let selfClosing = false;
      for (;;) {
        at = skipSpace(at);
        if (source.startsWith("/>", at)) {
          selfClosing = true;
          at += 2;
          break;
        }
        if (source[at] === ">") {
          at += 1;
          break;
        }
        NAME.lastIndex = at;
        const attribute = NAME.exec(source)?.[0];
        if (!attribute) fail(`<${name}> is not closed with >.`, i);
        at = skipSpace(at + attribute!.length);
        if (source[at] !== "=") fail(`the attribute ${attribute} has no value.`, i);
        at = skipSpace(at + 1);
        const quote = source[at];
        if (quote !== '"' && quote !== "'") fail(`the attribute ${attribute} needs quotes round its value.`, i);
        const end = source.indexOf(quote, at + 1);
        if (end < 0) fail(`the attribute ${attribute} is never closed.`, i);
        element.attributes[attribute!] = decode(source.slice(at + 1, end), at + 1);
        at = end + 1;
      }

      if (stack.length > 0) stack[stack.length - 1].children.push(element);
      if (selfClosing) {
        if (stack.length === 0) root = element;
      } else {
        stack.push(element);
      }
      i = at;
    } else {
      const next = source.indexOf("<", i);
      const end = next < 0 ? source.length : next;
      const raw = source.slice(i, end);
      if (stack.length > 0) stack[stack.length - 1].text += decode(raw, i);
      else if (raw.trim().length > 0 && root) fail(`there is more after the end of <${root.name}>.`, i);
      i = end;
    }
  }

  if (stack.length > 0) throw new XmlError(`The file ends before <${stack[stack.length - 1].name}> is closed.`);
  if (!root) throw new XmlError("The file has no XML element in it.");
  return root;
}
