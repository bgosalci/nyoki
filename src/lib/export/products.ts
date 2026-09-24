import { marginPercent, nothsBreakdown, priceBreakdown, productionCostPence } from "@/lib/costing/costing";
import type { EntryLine } from "@/lib/costing/import";
import { hundredthsText } from "@/lib/costing/rows";
import { num, toCsv, type Cell } from "@/lib/export/csv";
import type { ProductStatus } from "@/lib/products/validate";

export interface ExportProduct {
  name: string;
  slug: string;
  sku: string | null;
  status: ProductStatus;
  categories: string[];
  pricePence: number;
  compareAtPence: number | null;
  vatRate: number;
  stock: number;
  madeToOrder: boolean;
  description: string | null;
  materials: string | null;
  dimensions: string | null;
  careInstructions: string | null;
  weightGrams: number | null;
  featured: boolean;
  oneOfAKind: boolean;
  leadTimeDays: number | null;
  /** In order, as stored: a path on this site, or a full address. */
  photos: string[];
  lines: EntryLine[];
}

const STATUS: Record<ProductStatus, string> = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" };

const HEADER = [
  "Name",
  "Product code",
  "Status",
  "Categories",
  "Price",
  "Was price",
  "VAT %",
  "VAT",
  "After VAT",
  "Cost",
  "Profit",
  "Margin %",
  "Times cost",
  "NOTHS fee",
  "NOTHS profit",
  "Stock",
  "Made to order",
  "Cost lines",
  "Web address",
  "Description",
  "Materials",
  "Dimensions",
  "Care instructions",
  "Weight (g)",
  "Lead time (days)",
  "One of a kind",
  "Featured",
  "Photos",
];

/** Pounds as text, exact: 1299 is "12.99", a loss of 170 is "-1.70". */
const money = (pence: number) => (pence / 100).toFixed(2);

/**
 * A product as every format writes it: its fields, lists as lists, money as
 * text, and the figures worked out from its price and costs kept apart.
 * CSV, JSON and XML are all written from this, so they cannot disagree.
 */
export interface ExportRecord {
  name: string;
  productCode: string | null;
  status: string;
  categories: string[];
  price: string | null;
  wasPrice: string | null;
  vatRate: number;
  stock: number;
  madeToOrder: boolean;
  costLines: { what: string; costEach: string; howMany: number }[];
  webAddress: string;
  description: string | null;
  materials: string | null;
  dimensions: string | null;
  careInstructions: string | null;
  weightGrams: number | null;
  leadTimeDays: number | null;
  oneOfAKind: boolean;
  featured: boolean;
  photos: string[];
  workedOut: {
    vat: string | null;
    afterVat: string | null;
    cost: string | null;
    profit: string | null;
    marginPercent: number | null;
    timesCost: number | null;
    nothsFee: string | null;
    nothsProfit: string | null;
  };
}

function toRecord(product: ExportProduct, origin: string): ExportRecord {
  const priced = product.pricePence > 0;
  const costed = product.lines.length > 0;
  const costPence = productionCostPence(product.lines);

  const input = { pricePence: product.pricePence, costPence, vatRate: product.vatRate };
  const breakdown = priceBreakdown(input);
  const noths = nothsBreakdown(input);
  const margin = marginPercent(breakdown);

  // A figure that needs a price, or a price and costs, is left empty without
  // them: an uncosted piece's whole price would otherwise read as profit.
  const ifPriced = <T,>(value: T) => (priced ? value : null);
  const ifBoth = <T,>(value: T) => (priced && costed ? value : null);

  return {
    name: product.name,
    productCode: product.sku,
    status: STATUS[product.status],
    categories: product.categories,
    price: ifPriced(money(product.pricePence)),
    wasPrice: product.compareAtPence !== null && priced ? money(product.compareAtPence) : null,
    vatRate: product.vatRate,
    stock: product.stock,
    madeToOrder: product.madeToOrder,
    costLines: product.lines.map((line) => ({
      what: line.label,
      costEach: money(line.unitPence),
      howMany: Number(hundredthsText(line.quantityHundredths)),
    })),
    webAddress: product.slug,
    description: product.description,
    materials: product.materials,
    dimensions: product.dimensions,
    careInstructions: product.careInstructions,
    weightGrams: product.weightGrams,
    leadTimeDays: product.leadTimeDays,
    oneOfAKind: product.oneOfAKind,
    featured: product.featured,
    // Full addresses, so a link in the file opens wherever the file is.
    photos: product.photos.map((url) => new URL(url, origin).toString()),
    workedOut: {
      vat: ifPriced(money(breakdown.vatPence)),
      afterVat: ifPriced(money(breakdown.exVatPence)),
      cost: costed ? money(costPence) : null,
      profit: ifBoth(money(breakdown.profitPence)),
      marginPercent: ifBoth(margin !== null ? Number(margin.toFixed(1)) : null),
      timesCost: ifBoth(breakdown.costMultiple !== null ? Number(breakdown.costMultiple.toFixed(2)) : null),
      nothsFee: ifPriced(money(noths.feePence)),
      nothsProfit: ifBoth(money(noths.profitPence)),
    },
  };
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");
const number = (value: string | number | null) => (value === null ? null : num(String(value)));

function row(product: ExportProduct, origin: string): Cell[] {
  const record = toRecord(product, origin);
  const figures = record.workedOut;

  return [
    record.name,
    record.productCode,
    record.status,
    record.categories.join("; "),
    number(record.price),
    number(record.wasPrice),
    number(record.vatRate),
    number(figures.vat),
    number(figures.afterVat),
    number(figures.cost),
    number(figures.profit),
    figures.marginPercent === null ? null : num(figures.marginPercent.toFixed(1)),
    figures.timesCost === null ? null : num(figures.timesCost.toFixed(2)),
    number(figures.nothsFee),
    number(figures.nothsProfit),
    number(record.stock),
    yesNo(record.madeToOrder),
    record.costLines.map((line) => `${line.what} ${line.costEach} × ${line.howMany}`).join("; "),
    record.webAddress,
    record.description,
    record.materials,
    record.dimensions,
    record.careInstructions,
    number(record.weightGrams),
    number(record.leadTimeDays),
    yesNo(record.oneOfAKind),
    yesNo(record.featured),
    record.photos.join("; "),
  ];
}

/**
 * The catalogue as a spreadsheet: every product as the database holds it -
 * details, photos, costs and price - with the figures an accountant would
 * ask for. Every figure is worked out by the same sums as the Price tab, so
 * the file and the admin agree.
 *
 * `origin` is the site's own address, to turn a stored photo path into a
 * link that opens from the file.
 */
export function productsCsv(products: readonly ExportProduct[], { origin }: { origin: string }): string {
  return toCsv([HEADER, ...products.map((product) => row(product, origin))]);
}

export type ExportFormat = "csv" | "json" | "xml";

export const EXPORT_FORMATS: Record<ExportFormat, { contentType: string; extension: string }> = {
  csv: { contentType: "text/csv; charset=utf-8", extension: "csv" },
  json: { contentType: "application/json; charset=utf-8", extension: "json" },
  xml: { contentType: "application/xml; charset=utf-8", extension: "xml" },
};

export interface ExportOptions {
  /** The site's own address, to make stored photo paths into links. */
  origin: string;
  exportedAt: Date;
}

/** The products as JSON, for other software: `{ shop, exported, products: [...] }`. */
export function productsJson(products: readonly ExportProduct[], { origin, exportedAt }: ExportOptions): string {
  const file = { shop: "Nyoki", exported: exportedAt.toISOString(), products: products.map((product) => toRecord(product, origin)) };
  return `${JSON.stringify(file, null, 2)}\n`;
}

// Characters XML 1.0 cannot hold at all, even escaped. Written, they would
// make a file nothing can read, so they are left out.
const NOT_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
const xmlText = (value: string) => value.replace(NOT_XML, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const xmlAttribute = (value: string) => xmlText(value).replace(/"/g, "&quot;");

/** What one item of each list is called. */
const XML_ITEM: Record<string, string> = { categories: "category", costLines: "line", photos: "photo" };

function xmlElement(name: string, value: unknown, indent: string): string {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return `${indent}<${name}/>`;
  if (Array.isArray(value)) {
    const items = value.map((item) => xmlElement(XML_ITEM[name] ?? "item", item, `${indent}  `));
    return `${indent}<${name}>\n${items.join("\n")}\n${indent}</${name}>`;
  }
  if (typeof value === "object") {
    const fields = Object.entries(value).map(([field, inner]) => xmlElement(field, inner, `${indent}  `));
    return `${indent}<${name}>\n${fields.join("\n")}\n${indent}</${name}>`;
  }
  return `${indent}<${name}>${xmlText(String(value))}</${name}>`;
}

/** The products as XML, for other software: one <product> per product, lists as elements. */
export function productsXml(products: readonly ExportProduct[], { origin, exportedAt }: ExportOptions): string {
  const body = products.map((product) => xmlElement("product", toRecord(product, origin), "  ")).join("\n");
  const opening = `<products shop="Nyoki" exported="${xmlAttribute(exportedAt.toISOString())}">`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${opening}\n${body}${body ? "\n" : ""}</products>\n`;
}

export function exportProducts(format: ExportFormat, products: readonly ExportProduct[], options: ExportOptions): string {
  switch (format) {
    case "json":
      return productsJson(products, options);
    case "xml":
      return productsXml(products, options);
    default:
      return productsCsv(products, options);
  }
}

/** "nyoki-products-2026-09-24.csv", dated as the day is in the UK. */
export function exportFilename(now: Date, format: ExportFormat = "csv"): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `nyoki-products-${parts.year}-${parts.month}-${parts.day}.${EXPORT_FORMATS[format].extension}`;
}
