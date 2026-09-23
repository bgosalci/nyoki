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

/** Pounds as a spreadsheet number: 1299 is 12.99, a loss of 170 is -1.70. */
const pounds = (pence: number) => num((pence / 100).toFixed(2));

const yesNo = (value: boolean) => (value ? "Yes" : "No");
const whole = (value: number | null) => (value === null ? null : num(String(value)));

function row(product: ExportProduct, origin: string): Cell[] {
  const priced = product.pricePence > 0;
  const costed = product.lines.length > 0;
  const costPence = productionCostPence(product.lines);

  const input = { pricePence: product.pricePence, costPence, vatRate: product.vatRate };
  const breakdown = priceBreakdown(input);
  const noths = nothsBreakdown(input);
  const margin = marginPercent(breakdown);

  // A figure that needs a price, or a price and costs, is left blank without
  // them: an uncosted piece's whole price would otherwise read as profit.
  const ifPriced = (cell: Cell) => (priced ? cell : null);
  const ifBoth = (cell: Cell) => (priced && costed ? cell : null);

  return [
    product.name,
    product.sku,
    STATUS[product.status],
    product.categories.join("; "),
    ifPriced(pounds(product.pricePence)),
    product.compareAtPence !== null && priced ? pounds(product.compareAtPence) : null,
    num(String(product.vatRate)),
    ifPriced(pounds(breakdown.vatPence)),
    ifPriced(pounds(breakdown.exVatPence)),
    costed ? pounds(costPence) : null,
    ifBoth(pounds(breakdown.profitPence)),
    ifBoth(margin !== null ? num(margin.toFixed(1)) : null),
    ifBoth(breakdown.costMultiple !== null ? num(breakdown.costMultiple.toFixed(2)) : null),
    ifPriced(pounds(noths.feePence)),
    ifBoth(pounds(noths.profitPence)),
    num(String(product.stock)),
    yesNo(product.madeToOrder),
    product.lines
      .map((line) => `${line.label} ${(line.unitPence / 100).toFixed(2)} × ${hundredthsText(line.quantityHundredths)}`)
      .join("; "),
    product.slug,
    product.description,
    product.materials,
    product.dimensions,
    product.careInstructions,
    whole(product.weightGrams),
    whole(product.leadTimeDays),
    yesNo(product.oneOfAKind),
    yesNo(product.featured),
    // Full addresses, so a link in the file opens wherever the file is.
    product.photos.map((url) => new URL(url, origin).toString()).join("; "),
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

/** "nyoki-products-2026-09-24.csv", dated as the day is in the UK. */
export function exportFilename(now: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `nyoki-products-${parts.year}-${parts.month}-${parts.day}.csv`;
}
