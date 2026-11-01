/**
 * What a piece of clothing offers a shopper: the colours and sizes to choose
 * from, and which of them are in stock.
 *
 * Built on the server from the piece's colours, sizes and variants, and
 * handed to the page. Pure, so the basket can check by the same rules.
 */

import { neverRunsOut } from "@/lib/products/stock-limit";

/** The stock of one colour in one size; null where the piece has no colours, or no sizes. */
export interface StockRow {
  colour: string | null;
  size: string | null;
  stock: number;
}

export interface ClothingOffer {
  colours: string[];
  sizes: string[];
  /** The stock of each colour in each size. A combination not listed has none. */
  stock: StockRow[];
  /** Never out of stock: made to order, or made on order. */
  unlimited: boolean;
}

export interface ClothingSource {
  colours: readonly string[];
  sizes: readonly string[];
  madeToOrder: boolean;
  madeOnOrder: boolean;
  variants: readonly StockRow[];
}

/** Whether a variant's colour or size is one the piece still offers. */
const fits = (value: string | null, offered: readonly string[]) => (offered.length === 0 ? value === null : value !== null && offered.includes(value));

/** The offer, or null for a piece with no colours and no sizes - nothing to choose. */
export function toClothingOffer(source: ClothingSource): ClothingOffer | null {
  const { colours, sizes } = source;
  if (colours.length === 0 && sizes.length === 0) return null;

  return {
    colours: [...colours],
    sizes: [...sizes],
    stock: source.variants
      .filter((row) => fits(row.colour, colours) && fits(row.size, sizes))
      .map(({ colour, size, stock }) => ({ colour, size, stock })),
    unlimited: neverRunsOut(source),
  };
}

/**
 * Whether the piece is in stock in this colour and this size. Null for
 * either means in any, so a colour is in stock while any of its sizes is,
 * and a size while it is in any colour.
 */
export function inStock(offer: ClothingOffer, colour: string | null, size: string | null): boolean {
  if (offer.unlimited) return true;
  return offer.stock.some((row) => row.stock > 0 && (colour === null || row.colour === colour) && (size === null || row.size === size));
}

/** Nothing left in any colour or size. */
export function soldOut(offer: ClothingOffer): boolean {
  return !inStock(offer, null, null);
}
