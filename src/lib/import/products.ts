import { productionCostPence } from "@/lib/costing/costing";
import type { EntryLine } from "@/lib/costing/import";
import { parseQuantityToHundredths, VAT_RATES } from "@/lib/costing/validate";
import { CsvError, parseCsv } from "@/lib/import/csv";
import { formatPence, parsePoundsToPence } from "@/lib/money";
import type { ProductStatus } from "@/lib/products/validate";
import { slugify } from "@/lib/slug";

/**
 * Reading products back from a CSV file - our own export, edited in a
 * spreadsheet, or one typed from scratch - into a plan of what would change.
 *
 * Pure: the file, the products and the categories go in, and out comes, row
 * by row, whether it adds a product or changes one, what exactly changes, and
 * anything wrong with it. Nothing is written until that plan has been seen.
 *
 * - A row is matched to a product by its **web address**; a row with a new
 *   one, or none, adds a product.
 * - A column left out of the file changes nothing. A column present is what
 *   the product becomes - a blank cell included - except Status, where blank
 *   leaves it as it is.
 * - The columns the export works out (VAT, profit, margin...) are ignored:
 *   they follow from the price and costs. Photos are not imported.
 * - The same rules as the admin's own forms: a name, whole-number stock, a
 *   lead time for made-to-order, no active piece without a price, a
 *   was-price above the price, one product per code.
 */

export interface ExistingProduct {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  status: ProductStatus;
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
  categoryIds: string[];
  lines: EntryLine[];
}

export interface ImportCategory {
  id: string;
  name: string;
}

/** What a product will be once the row is imported. */
export type ImportValues = Omit<ExistingProduct, "id">;

export interface RowChange {
  label: string;
  from: string;
  to: string;
}

export interface RowPlan {
  /** As a spreadsheet numbers it: the headings are row 1. */
  row: number;
  kind: "new" | "update" | "unchanged";
  name: string;
  slug: string;
  productId: string | null;
  changes: RowChange[];
  problems: string[];
  values: ImportValues;
}

export interface ImportPlan {
  error: string | null;
  columns: { used: string[]; workedOut: string[]; notImported: string[]; unknown: string[] };
  rows: RowPlan[];
  /** Rows with problems are counted apart, not as added or changed. */
  counts: { added: number; changed: number; unchanged: number; withProblems: number };
}

export const MAX_ROWS = 2000;

type Field = keyof ImportValues;

/** The export's headings, as the fields they set, in the export's order. */
const IMPORTED: [heading: string, field: Field][] = [
  ["Name", "name"],
  ["Product code", "sku"],
  ["Status", "status"],
  ["Categories", "categoryIds"],
  ["Price", "pricePence"],
  ["Was price", "compareAtPence"],
  ["VAT %", "vatRate"],
  ["Stock", "stock"],
  ["Made to order", "madeToOrder"],
  ["Cost lines", "lines"],
  ["Web address", "slug"],
  ["Description", "description"],
  ["Materials", "materials"],
  ["Dimensions", "dimensions"],
  ["Care instructions", "careInstructions"],
  ["Weight (g)", "weightGrams"],
  ["Lead time (days)", "leadTimeDays"],
  ["One of a kind", "oneOfAKind"],
  ["Featured", "featured"],
];

const WORKED_OUT = ["VAT", "After VAT", "Cost", "Profit", "Margin %", "Times cost", "NOTHS fee", "NOTHS profit"];
const NOT_IMPORTED = ["Photos"];

/** How a change is labelled when it is shown, in the order it is shown. */
const LABEL: Partial<Record<Field, string>> = {
  name: "Name",
  sku: "Product code",
  status: "Status",
  categoryIds: "Categories",
  pricePence: "Price",
  compareAtPence: "Was price",
  vatRate: "VAT",
  stock: "Stock",
  madeToOrder: "Made to order",
  lines: "Costs",
  description: "Description",
  materials: "Materials",
  dimensions: "Dimensions",
  careInstructions: "Care instructions",
  weightGrams: "Weight (g)",
  leadTimeDays: "Lead time (days)",
  oneOfAKind: "One of a kind",
  featured: "Featured",
};

const NEW_PRODUCT: ImportValues = {
  slug: "",
  name: "",
  sku: null,
  status: "DRAFT",
  pricePence: 0,
  compareAtPence: null,
  vatRate: 20,
  stock: 0,
  madeToOrder: false,
  description: null,
  materials: null,
  dimensions: null,
  careInstructions: null,
  weightGrams: null,
  featured: false,
  oneOfAKind: false,
  leadTimeDays: null,
  categoryIds: [],
  lines: [],
};

const key = (heading: string) => heading.trim().toLowerCase();

/** The export marks text a spreadsheet would run as a formula with an apostrophe; take it back. */
const unguarded = (cell: string) => (/^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell);

const optionalText = (cell: string) => {
  const text = cell.replace(/\r\n?/g, "\n").trim();
  return text.length > 0 ? text : null;
};

const STATUS_WORDS: Record<string, ProductStatus> = { active: "ACTIVE", draft: "DRAFT", archived: "ARCHIVED" };
const STATUS_TEXT: Record<ProductStatus, string> = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" };

const YES = new Set(["yes", "y", "true", "1"]);
const NO = new Set(["no", "n", "false", "0", ""]);

const LINE = /^(.+?)\s+£?(\d+(?:\.\d{1,2})?)\s*[×xX]\s*(\d+(?:\.\d{1,2})?)$/;

function parseLines(cell: string): EntryLine[] | null {
  const lines: EntryLine[] = [];
  for (const part of cell.split(";").map((item) => item.trim()).filter(Boolean)) {
    const match = LINE.exec(part);
    const unitPence = match ? parsePoundsToPence(match[2]) : null;
    const quantityHundredths = match ? parseQuantityToHundredths(match[3]) : null;
    if (!match || unitPence === null || quantityHundredths === null || quantityHundredths === 0) return null;
    lines.push({ label: match[1].trim(), unitPence, quantityHundredths });
  }
  return lines;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join("\u0000") === [...b].sort().join("\u0000");
const sameLines = (a: readonly EntryLine[], b: readonly EntryLine[]) => JSON.stringify(a) === JSON.stringify(b);

function same(field: Field, a: ImportValues, b: ImportValues): boolean {
  if (field === "categoryIds") return sameSet(a.categoryIds, b.categoryIds);
  if (field === "lines") return sameLines(a.lines, b.lines);
  return a[field] === b[field];
}

function shown(field: Field, values: ImportValues, categoryName: (id: string) => string): string {
  const none = "(none)";
  switch (field) {
    case "pricePence":
      return values.pricePence > 0 ? formatPence(values.pricePence) : none;
    case "compareAtPence":
      return values.compareAtPence !== null ? formatPence(values.compareAtPence) : none;
    case "vatRate":
      return `${values.vatRate}%`;
    case "status":
      return STATUS_TEXT[values.status];
    case "categoryIds":
      return values.categoryIds.length > 0 ? values.categoryIds.map(categoryName).sort().join("; ") : none;
    case "lines": {
      const count = values.lines.length;
      return count > 0 ? `${count} ${count === 1 ? "line" : "lines"}, ${formatPence(productionCostPence(values.lines))}` : none;
    }
    case "madeToOrder":
    case "oneOfAKind":
    case "featured":
      return values[field] ? "Yes" : "No";
    default: {
      const value = values[field];
      if (value === null || value === "") return none;
      const text = String(value).replace(/\s+/g, " ");
      return text.length > 60 ? `${text.slice(0, 59)}…` : text;
    }
  }
}

const EMPTY_PLAN = (error: string): ImportPlan => ({
  error,
  columns: { used: [], workedOut: [], notImported: [], unknown: [] },
  rows: [],
  counts: { added: 0, changed: 0, unchanged: 0, withProblems: 0 },
});

export function planImport(text: string, existing: readonly ExistingProduct[], categories: readonly ImportCategory[]): ImportPlan {
  let table: string[][];
  try {
    table = parseCsv(text);
  } catch (error) {
    if (error instanceof CsvError) return EMPTY_PLAN(error.message);
    throw error;
  }

  if (table.length === 0) return EMPTY_PLAN("The file is empty.");
  const [headings, ...body] = table;
  if (body.length === 0) return EMPTY_PLAN("The file has headings but no rows beneath them.");
  if (body.length > MAX_ROWS) return EMPTY_PLAN(`The file has ${body.length} rows; import at most ${MAX_ROWS.toLocaleString("en-GB")} at a time.`);

  // Which column holds which field.
  const byHeading = new Map(IMPORTED.map(([heading, field]) => [key(heading), field]));
  const columnOf = new Map<Field, number>();
  const columns: ImportPlan["columns"] = { used: [], workedOut: [], notImported: [], unknown: [] };

  for (const [index, raw] of headings.entries()) {
    const heading = raw.trim();
    const field = byHeading.get(key(heading));
    if (field) {
      if (columnOf.has(field)) return EMPTY_PLAN(`The column ${heading} appears twice.`);
      columnOf.set(field, index);
      columns.used.push(heading);
    } else if (WORKED_OUT.some((name) => key(name) === key(heading))) {
      columns.workedOut.push(heading);
    } else if (NOT_IMPORTED.some((name) => key(name) === key(heading))) {
      columns.notImported.push(heading);
    } else if (heading.length > 0) {
      columns.unknown.push(heading);
    }
  }

  if (!columnOf.has("name") && !columnOf.has("slug")) {
    return { ...EMPTY_PLAN("The file needs a Name or a Web address column, to know which products it is about."), columns };
  }

  const bySlug = new Map(existing.map((product) => [product.slug, product]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoriesByName = new Map<string, ImportCategory[]>();
  for (const category of categories) {
    categoriesByName.set(key(category.name), [...(categoriesByName.get(key(category.name)) ?? []), category]);
  }
  const categoryName = (id: string) => categoryById.get(id)?.name ?? id;

  const seenSlugs = new Map<string, number>();
  const seenCodes = new Map<string, { row: number; slug: string }>();
  const rows: RowPlan[] = [];

  for (const [index, cells] of body.entries()) {
    const rowNumber = index + 2;
    const problems: string[] = [];
    const cell = (field: Field): string | undefined => {
      const column = columnOf.get(field);
      return column === undefined ? undefined : unguarded(cells[column] ?? "").trim();
    };

    // Which product the row is about.
    const nameCell = cell("name");
    const slugCell = cell("slug");
    // Exactly as stored first: an address imported from Shopify can hold
    // what slugify would strip, and tidied it would match nothing and add a
    // duplicate. Tidied only to find one written loosely, or to make a new one.
    const typed = (slugCell ?? "").trim().toLowerCase();
    let product = typed ? (bySlug.get(typed) ?? bySlug.get(slugify(typed))) : undefined;
    const givenSlug = product ? product.slug : slugify(typed);
    let slug = givenSlug;

    if (!givenSlug) {
      slug = slugify(nameCell ?? "");
      if (!slug) problems.push("Give it a Name or a Web address.");
      else if (bySlug.has(slug)) {
        problems.push(
          `There is already a product at the web address ${slug}. To change it, give its Web address; to add another, name this one differently.`,
        );
        product = undefined;
      }
    } else if (!product && !nameCell) {
      problems.push(`No product has the web address ${givenSlug}, and without a Name one cannot be added.`);
    }

    if (slug) {
      const earlier = seenSlugs.get(slug);
      if (earlier !== undefined) problems.push(`Row ${earlier} is already ${slug}.`);
      else seenSlugs.set(slug, rowNumber);
    }

    const base: ImportValues = product ? { ...product } : { ...NEW_PRODUCT, slug };
    delete (base as Partial<ExistingProduct>).id;
    const values: ImportValues = { ...base, slug: product ? product.slug : slug };

    // Each column present sets its field.
    const read = <T,>(field: Field, parse: (value: string) => T | null, message: string): T | undefined => {
      const value = cell(field);
      if (value === undefined) return undefined;
      const parsed = parse(value);
      if (parsed === null) {
        problems.push(message);
        return undefined;
      }
      return parsed;
    };

    if (nameCell !== undefined) {
      if (nameCell.length > 0) values.name = nameCell;
      else if (product) problems.push("Give it a name.");
    }

    const sku = cell("sku");
    if (sku !== undefined) values.sku = optionalText(sku);

    const status = cell("status");
    if (status) {
      const parsed = STATUS_WORDS[status.toLowerCase()];
      if (parsed) values.status = parsed;
      else problems.push("Status: say Active, Draft or Archived.");
    }

    const categoryCell = cell("categoryIds");
    if (categoryCell !== undefined) {
      const ids: string[] = [];
      for (const name of categoryCell.split(";").map((item) => item.trim()).filter(Boolean)) {
        const found = categoriesByName.get(key(name)) ?? [];
        if (found.length === 0) problems.push(`Categories: there is no category called "${name}".`);
        else if (found.length > 1) problems.push(`Categories: more than one category is called "${name}".`);
        else if (!ids.includes(found[0].id)) ids.push(found[0].id);
      }
      values.categoryIds = ids;
    }

    const price = read("pricePence", (value) => (value === "" ? 0 : parsePoundsToPence(value)), "Price: write it as pounds and pence, like 8.50.");
    if (price !== undefined) values.pricePence = price;

    const was = read(
      "compareAtPence",
      (value) => (value === "" ? { pence: null } : ((pence) => (pence === null ? null : { pence }))(parsePoundsToPence(value))),
      "Was price: write it as pounds and pence, like 10.00.",
    );
    if (was !== undefined) values.compareAtPence = was.pence;

    const vat = read(
      "vatRate",
      (value) => (value === "" ? values.vatRate : /^\d+$/.test(value) && (VAT_RATES as readonly number[]).includes(Number(value)) ? Number(value) : null),
      "VAT %: use 20, 5 or 0.",
    );
    if (vat !== undefined) values.vatRate = vat;

    const whole = (value: string) => (value === "" ? 0 : /^\d+$/.test(value) ? Number.parseInt(value, 10) : null);
    const optionalWhole = (value: string) => (value === "" ? { n: null } : /^\d+$/.test(value) ? { n: Number.parseInt(value, 10) } : null);

    const stock = read("stock", whole, "Stock: write a whole number, zero or more.");
    if (stock !== undefined) values.stock = stock;

    const weight = read("weightGrams", optionalWhole, "Weight (g): write a whole number of grams.");
    if (weight !== undefined) values.weightGrams = weight.n;

    const lead = read("leadTimeDays", optionalWhole, "Lead time (days): write a whole number of days.");
    if (lead !== undefined) values.leadTimeDays = lead.n;

    for (const [field, heading] of [["madeToOrder", "Made to order"], ["oneOfAKind", "One of a kind"], ["featured", "Featured"]] as const) {
      const flag = read(field, (value) => (YES.has(value.toLowerCase()) ? true : NO.has(value.toLowerCase()) ? false : null), `${heading}: say Yes or No.`);
      if (flag !== undefined) values[field] = flag;
    }

    const lines = read(
      "lines",
      parseLines,
      'Cost lines: write each as what, cost and how many - like "Bag 0.05 × 1" - separated by semicolons.',
    );
    if (lines !== undefined) values.lines = lines;

    for (const field of ["description", "materials", "dimensions", "careInstructions"] as const) {
      const value = cell(field);
      if (value !== undefined) values[field] = optionalText(value);
    }

    // The rules the admin's own forms keep.
    if (values.oneOfAKind) values.stock = 1;
    if (values.madeToOrder && values.leadTimeDays === null) problems.push("Made to order needs a lead time in days.");
    if (values.compareAtPence !== null) {
      if (values.pricePence === 0) problems.push("A was-price needs a price to be higher than.");
      else if (values.compareAtPence <= values.pricePence) {
        problems.push("The was-price has to be higher than the price, or there is nothing to strike through.");
      }
    }
    if (values.status === "ACTIVE" && values.pricePence === 0) problems.push("It has no price, so it cannot be made active.");

    if (values.sku) {
      const owner = existing.find((other) => other.sku === values.sku && other.id !== product?.id);
      // A code clashes only with a different product; a row repeating an
      // earlier one is a problem of its own, said once.
      const earlier = seenCodes.get(values.sku);
      if (owner) problems.push(`Product code ${values.sku} is already used by ${owner.name}.`);
      else if (earlier !== undefined && earlier.slug !== values.slug) {
        problems.push(`Product code ${values.sku} is already given to row ${earlier.row}.`);
      } else if (earlier === undefined) seenCodes.set(values.sku, { row: rowNumber, slug: values.slug });
    }

    // What changes, in the order the admin shows it.
    const changes: RowChange[] = [];
    for (const field of Object.keys(LABEL) as Field[]) {
      if (!product && (field === "name" || !columnOf.has(field))) continue;
      if (!product && same(field, values, NEW_PRODUCT)) continue;
      if (product && same(field, values, base)) continue;
      changes.push({ label: LABEL[field]!, from: product ? shown(field, base, categoryName) : "(none)", to: shown(field, values, categoryName) });
    }

    rows.push({
      row: rowNumber,
      kind: product ? (changes.length > 0 ? "update" : "unchanged") : "new",
      name: values.name || slug,
      slug: values.slug,
      productId: product?.id ?? null,
      changes,
      problems,
      values,
    });
  }

  const clean = rows.filter((row) => row.problems.length === 0);
  return {
    error: null,
    columns,
    rows,
    counts: {
      added: clean.filter((row) => row.kind === "new").length,
      changed: clean.filter((row) => row.kind === "update").length,
      unchanged: clean.filter((row) => row.kind === "unchanged").length,
      withProblems: rows.length - clean.length,
    },
  };
}

/**
 * What the plan would do, as one string. The import is checked, then applied
 * in a second request; the plan is worked out afresh from the database then,
 * and applied only if it matches what was seen - so nothing changed in the
 * meantime is overwritten by a preview that no longer holds.
 */
export function planSignature(plan: ImportPlan): string {
  return JSON.stringify(plan.rows.map((row) => [row.row, row.kind, row.productId, row.values, row.problems]));
}

/** A row as the import screen shows it: what it is and what changes, without the values behind it. */
export interface PreviewRow {
  row: number;
  kind: RowPlan["kind"];
  name: string;
  changes: RowChange[];
  problems: string[];
}

/** What the import screen is sent: the plan, less the rows that change nothing. */
export interface ImportPreview {
  error: string | null;
  columns: ImportPlan["columns"];
  counts: ImportPlan["counts"];
  rows: PreviewRow[];
  /** A hash of planSignature, handed back to apply what was seen. */
  signature: string;
}

export function toPreview(plan: ImportPlan, signature: string): ImportPreview {
  return {
    error: plan.error,
    columns: plan.columns,
    counts: plan.counts,
    rows: plan.rows
      .filter((row) => row.kind !== "unchanged" || row.problems.length > 0)
      .map(({ row, kind, name, changes, problems }) => ({ row, kind, name, changes, problems })),
    signature,
  };
}
