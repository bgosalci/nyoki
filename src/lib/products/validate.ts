import { slugify } from "@/lib/slug";

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

const STATUSES: readonly ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

export interface ProductInput {
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  sku: string | null;
  stock: number;
  weightGrams: number | null;
  featured: boolean;
  dimensions: string | null;
  materials: string | null;
  careInstructions: string | null;
  oneOfAKind: boolean;
  madeToOrder: boolean;
  leadTimeDays: number | null;
  categoryIds: string[];
}

/**
 * Errors are keyed by form field name.
 *
 * There is no price here. Prices are set on the Price tab, where they sit
 * beside what the piece costs to make; the product form neither shows a box
 * for one nor reads one if it is posted anyway.
 */
export type ProductField =
  | "name"
  | "slug"
  | "description"
  | "status"
  | "sku"
  | "stock"
  | "weightGrams"
  | "featured"
  | "dimensions"
  | "materials"
  | "careInstructions"
  | "oneOfAKind"
  | "madeToOrder"
  | "leadTimeDays"
  | "categoryIds";

export type ProductErrors = Partial<Record<ProductField, string>>;

export type ProductValidation =
  | { ok: true; data: ProductInput }
  | { ok: false; errors: ProductErrors };

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value.length > 0 ? value : null;
}

function checked(form: FormData, key: string): boolean {
  // An unchecked checkbox is simply absent from the submission.
  return form.get(key) !== null;
}

/**
 * Parse a whole, non-negative count. Returns undefined when absent so the
 * caller can distinguish "not given" from "given as zero".
 */
function count(value: string): number | null | undefined {
  if (value.length === 0) return undefined;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Validate a product form submission.
 *
 * Collects every problem rather than stopping at the first, so the form can
 * show them all at once instead of making the editor resubmit repeatedly.
 */
export function validateProductInput(form: FormData): ProductValidation {
  const errors: ProductErrors = {};

  const name = text(form, "name");
  const slugSource = text(form, "slug") || name;
  const slug = slugify(slugSource);

  if (name.length === 0) {
    errors.name = "Give the product a name.";
  } else if (slug.length === 0) {
    // Everything was punctuation, so there is no usable URL for it.
    errors.name = "That name has no letters or numbers to build a web address from.";
  }

  const stockParsed = count(text(form, "stock"));
  if (stockParsed === null) {
    errors.stock = "Stock has to be a whole number, zero or more.";
  }

  const weightParsed = count(text(form, "weightGrams"));
  if (weightParsed === null) {
    errors.weightGrams = "Weight has to be a whole number of grams.";
  }

  const statusRaw = text(form, "status") || "DRAFT";
  if (!STATUSES.includes(statusRaw as ProductStatus)) {
    errors.status = "Choose draft, active or archived.";
  }

  const madeToOrder = checked(form, "madeToOrder");
  const leadParsed = count(text(form, "leadTimeDays"));

  if (leadParsed === null) {
    errors.leadTimeDays = "Lead time has to be a whole number of days.";
  } else if (madeToOrder && leadParsed === undefined) {
    errors.leadTimeDays =
      "Give a lead time in days, so customers know how long a made-to-order piece takes.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const oneOfAKind = checked(form, "oneOfAKind");

  return {
    ok: true,
    data: {
      name,
      slug,
      description: optionalText(form, "description"),
      status: statusRaw as ProductStatus,
      sku: optionalText(form, "sku"),
      // There is exactly one of a one-of-a-kind piece, whatever was typed.
      stock: oneOfAKind ? 1 : (stockParsed ?? 0),
      weightGrams: weightParsed ?? null,
      featured: checked(form, "featured"),
      dimensions: optionalText(form, "dimensions"),
      materials: optionalText(form, "materials"),
      careInstructions: optionalText(form, "careInstructions"),
      oneOfAKind,
      madeToOrder,
      leadTimeDays: leadParsed ?? null,
      categoryIds: [
        ...new Set(
          form
            .getAll("categoryIds")
            .filter((entry): entry is string => typeof entry === "string")
            .map((id) => id.trim())
            .filter((id) => id.length > 0),
        ),
      ],
    },
  };
}
