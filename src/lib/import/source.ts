import { CsvError, parseCsv } from "@/lib/import/csv";
import { parseXml, XmlError, type XmlElement } from "@/lib/import/xml";

/**
 * Reading a product file - CSV, JSON or XML - into one shape: a record per
 * product, field name to text. Everything after this (the rules, the
 * preview, the import itself) is the same whichever format the file was.
 *
 * Values become the text a spreadsheet would hold, so one set of rules reads
 * them all: a list of categories becomes "Cards; Christmas Cards", a cost
 * line "Bag 0.05 × 1", true becomes "Yes". A field a JSON or XML product
 * does not mention is absent from its record - left as it is - where a CSV
 * row has every column.
 */

export type FileFormat = "csv" | "json" | "xml";

export interface ProductSource {
  format: FileFormat;
  /** Every field name the file uses, as written, first seen first. */
  names: string[];
  /** One per product: field name as written, to its value as text. */
  records: Map<string, string>[];
  /** How the file's products are numbered: spreadsheet rows start at 2, under the headings. */
  first: number;
  unit: "Row" | "Product";
}

/** A file that cannot be read as products, said in words a person can act on. */
export class SourceError extends Error {}

export function detectFormat(text: string): FileFormat {
  const start = text.replace(/^\uFEFF/, "").trimStart()[0];
  if (start === "{" || start === "[") return "json";
  if (start === "<") return "xml";
  return "csv";
}

export function readProducts(text: string): ProductSource {
  try {
    switch (detectFormat(text)) {
      case "json":
        return readJson(text);
      case "xml":
        return readXml(text);
      default:
        return readCsvProducts(text);
    }
  } catch (error) {
    if (error instanceof CsvError || error instanceof XmlError) throw new SourceError(error.message);
    throw error;
  }
}

const NO_PRODUCTS = "The file has no products in it.";

/** The CSV export marks text a spreadsheet would run as a formula with an apostrophe; take it back. */
const unguarded = (cell: string) => (/^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell);

function readCsvProducts(text: string): ProductSource {
  const table = parseCsv(text);
  if (table.length === 0) throw new SourceError("The file is empty.");
  const [headings, ...rows] = table;
  if (rows.length === 0) throw new SourceError("The file has headings but no rows beneath them.");

  const columns: [index: number, name: string][] = [];
  const seen = new Set<string>();
  for (const [index, raw] of headings.entries()) {
    const name = raw.trim();
    if (!name) continue;
    if (seen.has(name.toLowerCase())) throw new SourceError(`The column ${name} appears twice.`);
    seen.add(name.toLowerCase());
    columns.push([index, name]);
  }

  return {
    format: "csv",
    names: columns.map(([, name]) => name),
    records: rows.map((cells) => new Map(columns.map(([index, name]) => [name, unguarded(cells[index] ?? "")]))),
    first: 2,
    unit: "Row",
  };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** A cost line, from its three parts, as the spreadsheet format writes it. */
const lineText = (what: string, costEach: string, howMany: string) => `${what} ${costEach} × ${howMany}`;

function jsonText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) => (isObject(item) ? lineText(jsonText(item.what), jsonText(item.costEach), jsonText(item.howMany)) : jsonText(item)))
      .join("; ");
  }
  // A group of fields - the worked-out figures - is not something to import.
  return "";
}

function readJson(text: string): ProductSource {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new SourceError(`The file is not valid JSON: ${(error as Error).message}`);
  }

  const list = Array.isArray(parsed) ? parsed : isObject(parsed) && Array.isArray(parsed.products) ? parsed.products : null;
  if (!list) throw new SourceError('The JSON has no list of products: give a list, or an object with a "products" list.');
  if (list.length === 0) throw new SourceError(NO_PRODUCTS);

  const names: string[] = [];
  const records = list.map((item, index) => {
    if (!isObject(item)) throw new SourceError(`Product ${index + 1} in the file is not a set of fields.`);
    const record = new Map<string, string>();
    for (const [name, value] of Object.entries(item)) {
      if (!names.includes(name)) names.push(name);
      record.set(name, jsonText(value));
    }
    return record;
  });

  return { format: "json", names, records, first: 1, unit: "Product" };
}

/** Elements that are items of a list rather than fields of a group. */
const LIST_ITEMS = new Set(["category", "line", "photo", "item"]);

function xmlText(element: XmlElement): string {
  if (element.children.length === 0) return element.text.trim();
  if (!element.children.every((child) => LIST_ITEMS.has(child.name))) return "";

  return element.children
    .map((child) => {
      if (child.children.length === 0) return child.text.trim();
      const part = (name: string) => child.children.find((field) => field.name === name)?.text.trim() ?? "";
      return lineText(part("what"), part("costEach"), part("howMany"));
    })
    .join("; ");
}

function readXml(text: string): ProductSource {
  const root = parseXml(text);
  if (root.children.length === 0) throw new SourceError(NO_PRODUCTS);

  const names: string[] = [];
  const records = root.children.map((product, index) => {
    const record = new Map<string, string>();
    for (const field of product.children) {
      // Keeping one quietly would ignore the other - a price edited by adding
      // a second <price> would import as no change at all.
      if (record.has(field.name)) throw new SourceError(`Product ${index + 1} gives ${field.name} twice. Keep the one you mean.`);
      if (!names.includes(field.name)) names.push(field.name);
      record.set(field.name, xmlText(field));
    }
    return record;
  });

  return { format: "xml", names, records, first: 1, unit: "Product" };
}
