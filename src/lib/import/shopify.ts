/**
 * Reads a Shopify product export into the shape the CMS stores.
 *
 * Shopify writes one row per variant OR per extra image, all sharing a
 * Handle; only the first row of a handle carries the title, description,
 * type and tags. This module is pure - it never touches the database or the
 * network - so the whole mapping is testable from a string.
 */

import { parsePoundsToPence } from "@/lib/money";

export type ImportStatus = "ACTIVE" | "DRAFT";

export interface ImportedVariant {
  name: string;
  options: Record<string, string>;
  sku: string | null;
  /** null = same as the product price. */
  pricePence: number | null;
  stock: number;
  position: number;
}

export interface ImportedImage {
  url: string;
  alt: string | null;
  position: number;
}

export interface ImportedCategory {
  name: string;
  /** Top-level group, or null for a type that stands alone. */
  parent: string | null;
}

export interface ImportedProduct {
  slug: string;
  name: string;
  description: string | null;
  status: ImportStatus;
  pricePence: number;
  compareAtPence: number | null;
  sku: string | null;
  stock: number;
  weightGrams: number | null;
  variants: ImportedVariant[];
  images: ImportedImage[];
  category: ImportedCategory | null;
}

export interface ImportReport {
  products: ImportedProduct[];
  skipped: { handle: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** RFC 4180: quoted fields may hold commas, newlines and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// HTML descriptions
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", pound: "£", hellip: "…", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isNaN(n) ? match : String.fromCodePoint(n);
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Shopify descriptions are HTML; the CMS stores plain text with paragraphs. */
export function htmlToText(html: string): string | null {
  // Raw newlines inside HTML are whitespace; only <br> and block endings mean
  // anything. Mark those first, then treat every other run of whitespace as a
  // single space.
  const marked = html
    .replace(/<br\s*\/?>/gi, "\u0001")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\u0002")
    .replace(/<[^>]+>/g, "");

  const text = marked
    .split("\u0002")
    .map((paragraph) =>
      decodeEntities(paragraph)
        .split("\u0001")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n");

  return text.length > 0 ? text : null;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/** Groups follow the three price lists that sit beside the export. */
const GROUPS: [RegExp, string][] = [
  [/card|new baby (boy|girl)/i, "Cards"],
  [/brooch|hair|clip|band|necklace|bracelet|earring|bag|purse|scarf/i, "Accessories"],
  [/hat|bootie|vest|cardigan|dress|blanket|romper|bib|jumper|top\b|shoe/i, "Clothes"],
];

export function categoryFor(type: string): ImportedCategory | null {
  const name = type.trim();
  if (name.length === 0) return null;

  const group = GROUPS.find(([pattern]) => pattern.test(name));
  return { name, parent: group ? group[1] : null };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function pence(value: string): number | null {
  return value.trim().length === 0 ? null : parsePoundsToPence(value);
}

function integer(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isNaN(n) ? 0 : n;
}

function grams(value: string): number | null {
  const n = Number.parseFloat(value);
  return Number.isNaN(n) || n <= 0 ? null : Math.round(n);
}

function blank(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseShopifyExport(csvText: string): ImportReport {
  const [header, ...rows] = parseCsv(csvText);
  const index = new Map(header.map((name, i) => [name, i]));
  const col = (row: string[], name: string) => row[index.get(name) ?? -1] ?? "";

  const byHandle = new Map<string, string[][]>();
  for (const row of rows) {
    if (row.length < 2) continue;
    const handle = col(row, "Handle").trim();
    if (!handle) continue;
    const group = byHandle.get(handle) ?? [];
    group.push(row);
    byHandle.set(handle, group);
  }

  const products: ImportedProduct[] = [];
  const skipped: ImportReport["skipped"] = [];

  for (const [handle, group] of byHandle) {
    const first = group[0];

    if (/^true$/i.test(col(first, "Gift Card").trim())) {
      skipped.push({ handle, reason: "Shopify gift card: redeemed by Shopify, so it cannot be sold here." });
      continue;
    }

    const status: ImportStatus =
      col(first, "Status").trim().toLowerCase() === "active" && /^true$/i.test(col(first, "Published").trim())
        ? "ACTIVE"
        : "DRAFT";

    const optionNames = ["Option1 Name", "Option2 Name", "Option3 Name"]
      .map((name) => col(first, name).trim())
      .filter((name) => name.length > 0 && name !== "Title");

    const variantRows = group.filter((row) => col(row, "Variant Price").trim().length > 0);

    const variants: ImportedVariant[] = optionNames.length === 0
      ? []
      : variantRows.map((row, position) => {
          const options: Record<string, string> = {};
          optionNames.forEach((name, i) => {
            const value = col(row, `Option${i + 1} Value`).trim();
            if (value) options[name] = value;
          });
          return {
            name: Object.values(options).join(" / "),
            options,
            sku: blank(col(row, "Variant SKU")),
            pricePence: pence(col(row, "Variant Price")) ?? 0,
            stock: integer(col(row, "Variant Inventory Qty")),
            position,
          };
        });

    const variantPrices = variantRows.map((row) => pence(col(row, "Variant Price")) ?? 0);
    const pricePence = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;

    for (const variant of variants) {
      if (variant.pricePence === pricePence) variant.pricePence = null;
    }

    const compareRaw = pence(col(first, "Variant Compare At Price"));
    const compareAtPence = compareRaw !== null && compareRaw > pricePence ? compareRaw : null;

    const images: ImportedImage[] = group
      .filter((row) => col(row, "Image Src").trim().length > 0)
      .map((row) => ({ url: col(row, "Image Src").trim(), alt: blank(col(row, "Image Alt Text")), shopifyPosition: integer(col(row, "Image Position")) }))
      .sort((a, b) => a.shopifyPosition - b.shopifyPosition)
      .map(({ url, alt }, position) => ({ url, alt, position }));

    products.push({
      slug: handle,
      name: col(first, "Title").trim(),
      description: htmlToText(col(first, "Body (HTML)")),
      status,
      pricePence,
      compareAtPence,
      sku: variants.length === 0 ? blank(col(first, "Variant SKU")) : null,
      stock: variants.length === 0 ? integer(col(first, "Variant Inventory Qty")) : 0,
      weightGrams: grams(col(first, "Variant Grams")),
      variants,
      images,
      category: categoryFor(col(first, "Custom Product Type") || col(first, "Standardized Product Type")),
    });
  }

  return { products, skipped };
}
