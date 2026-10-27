import type { PricedLine } from "@/lib/basket/review";
import type { SummaryRow } from "@/lib/customisation/choices";

/**
 * An order's lines, copied from the priced basket: the name, code, photo,
 * price, VAT rate and the choices in words. Renaming, repricing or archiving
 * a piece later must never change what an old order says it sold.
 */
export interface OrderItemData {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  imageUrl: string | null;
  unitPricePence: number;
  quantity: number;
  totalPence: number;
  // A type literal rather than SummaryRow, an interface: only a literal is
  // accepted where the database takes JSON.
  details: { label: string; value: string }[];
  vatRate: number;
}

export function orderItems(lines: readonly PricedLine[]): OrderItemData[] {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    productName: line.name,
    variantName: line.variantName,
    sku: line.sku,
    imageUrl: line.image,
    unitPricePence: line.unitPence,
    quantity: line.quantity,
    totalPence: line.totalPence,
    details: line.details.map(({ label, value }) => ({ label, value })),
    vatRate: line.vatRate,
  }));
}

/** What makes two lines the same. A saved line's piece can be gone (null) since; it then matches nothing. */
type Comparable = Pick<OrderItemData, "variantId" | "unitPricePence" | "quantity" | "details"> & { productId: string | null };

const signature = (items: readonly Comparable[]) =>
  items
    .map((item) => JSON.stringify([item.productId, item.variantId, item.unitPricePence, item.quantity, item.details]))
    .sort()
    .join("\n");

/**
 * Whether the basket is still what the waiting order was made from. Ready to
 * pay shows the order, so once the basket has moved on - something added,
 * a price changed - the shopper goes back through checkout to see it.
 */
export function basketMatchesOrder(lines: readonly PricedLine[], items: readonly Comparable[]): boolean {
  return lines.length > 0 && signature(orderItems(lines)) === signature(items);
}

/** An order line's saved choices read back: only well-formed rows, so nothing odd is ever shown. */
export function detailsOf(json: unknown): SummaryRow[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (row): row is SummaryRow =>
      typeof row === "object" && row !== null && typeof (row as SummaryRow).label === "string" && typeof (row as SummaryRow).value === "string",
  );
}

/** The words to print, from a line's "Inside the card" row - "Printed: “…”" - or null for anything else. */
export function printedWords(value: string): string | null {
  const match = /^Printed: “([\s\S]*)”$/.exec(value);
  return match ? match[1] : null;
}
