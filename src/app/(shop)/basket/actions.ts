"use server";

import { refresh } from "next/cache";

import { lineKey } from "@/lib/basket/key";
import { fitsOffer, lineDetails, toChoices, toStored, type StoredChoices } from "@/lib/basket/lines";
import { roomFor, type ReviewProduct } from "@/lib/basket/review";
import {
  BASKET_PRODUCT,
  activeRates,
  basketIdForWriting,
  categoryNodes,
  findBasketId,
  loadReviewLines,
  reviewAndSave,
  storedOf,
  toReviewProduct,
  type BasketProductRow,
} from "@/lib/basket/store";
import { freeDelivery, type FreeDelivery } from "@/lib/checkout/totals";
import { clampQuantity, missingChoices, unitPricePence, type Choices, type SummaryRow } from "@/lib/customisation/choices";
import { db } from "@/lib/db";
import { orderingOpen } from "@/lib/ordering";

const CLOSED = "Online ordering opens soon.";

export interface AddedPiece {
  name: string;
  image: string | null;
  quantity: number;
  unitPence: number;
  details: SummaryRow[];
}

/** What the basket holds once a piece has gone in, for the panel that says so. */
export interface BasketSummary {
  pieces: number;
  subtotalPence: number;
  freeDelivery: FreeDelivery | null;
}

export type AddResult =
  | { ok: true; added: AddedPiece; basket: BasketSummary; note: string | null }
  | { ok: false; message: string };

async function activeProduct(productId: string, now: Date): Promise<ReviewProduct | null> {
  const [row, categories] = await Promise.all([
    db.product.findFirst({ where: { id: productId, status: "ACTIVE" }, include: BASKET_PRODUCT }),
    categoryNodes(),
  ]);
  return row ? toReviewProduct(row as BasketProductRow, categories, now) : null;
}

/**
 * Puts a piece in as chosen, as many as the stock allows beside what the
 * basket already holds; the same choices again add to the line already
 * there. The choices must be valid by the page's own rules, checked again
 * here.
 */
async function place(product: ReviewProduct, stored: StoredChoices, quantity: number, now: Date): Promise<AddResult> {
  const basketId = await basketIdForWriting();
  const lines = await loadReviewLines(basketId, now);

  const room = roomFor(lines, { stored, product });
  if (room === 0) {
    const holding = lines.some((line) => line.product.id === product.id);
    const message = product.oneOfAKind && holding
      ? "This piece is one of a kind, and it's already in your basket."
      : holding
        ? "You already have all we have of this in your basket."
        : "Sorry, this is out of stock.";
    return { ok: false, message };
  }

  const adding = Math.min(quantity, room);
  const choices = toChoices(product.offer, stored, product.variants, adding)!;
  const unitPence = unitPricePence(product.offer, choices)!;
  const key = lineKey(product.id, stored);

  await db.basketLine.upsert({
    where: { basketId_key: { basketId, key } },
    create: { basketId, productId: product.id, ...stored, quantity: adding, key, addedPricePence: unitPence },
    update: { quantity: { increment: adding } },
  });

  const [review, rates] = await Promise.all([reviewAndSave(basketId, now), activeRates()]);
  refresh();

  return {
    ok: true,
    added: { name: product.name, image: product.image, quantity: adding, unitPence, details: lineDetails(product.offer, choices) },
    basket: { pieces: review.pieces, subtotalPence: review.subtotalPence, freeDelivery: freeDelivery(rates, review.subtotalPence) },
    note: adding < quantity ? `There were only enough for ${adding}, so we've added ${adding}.` : null,
  };
}

/** Add to basket, from a piece's page. */
export async function addToBasket(productId: string, choices: Choices): Promise<AddResult> {
  if (!orderingOpen()) return { ok: false, message: CLOSED };

  const now = new Date();
  const product = await activeProduct(productId, now);
  if (!product) return { ok: false, message: "Sorry, that piece is no longer on the shop." };

  const quantity = clampQuantity(choices.quantity);
  const stored = toStored(product.offer, { ...choices, quantity }, product.variants);
  if (!stored) {
    return { ok: false, message: missingChoices(product.offer, choices)[0]?.message ?? "Please finish choosing first." };
  }

  return place(product, stored, quantity, now);
}

/** A line's new quantity, tidied into 1 to 99; the basket cuts it to the stock when it is next shown. */
export async function changeQuantity(lineId: string, quantity: number): Promise<void> {
  if (!orderingOpen()) return;
  const basketId = await findBasketId();
  if (!basketId) return;

  await db.basketLine.updateMany({ where: { id: lineId, basketId }, data: { quantity: clampQuantity(quantity) } });
  refresh();
}

/** What Put it back needs: the line as it was. */
export interface RemovedLine {
  productId: string;
  name: string;
  quantity: number;
  stored: StoredChoices;
}

/** Takes a line out at once, rather than asking first: the basket offers to put it back. */
export async function removeLine(lineId: string): Promise<RemovedLine | null> {
  if (!orderingOpen()) return null;
  const basketId = await findBasketId();
  if (!basketId) return null;

  const line = await db.basketLine.findFirst({ where: { id: lineId, basketId }, include: { product: { select: { name: true } } } });
  if (!line) return null;

  await db.basketLine.deleteMany({ where: { id: lineId, basketId } });
  refresh();

  return { productId: line.productId, name: line.product.name, quantity: line.quantity, stored: storedOf(line) };
}

/**
 * Puts a removed line back. What comes from the browser is checked again
 * like any piece going in: the piece must still be on the shop, and offer
 * these choices.
 */
export async function putBack(removed: RemovedLine): Promise<AddResult> {
  if (!orderingOpen()) return { ok: false, message: CLOSED };

  const now = new Date();
  const product = await activeProduct(removed.productId, now);
  if (!product) return { ok: false, message: `Sorry, ${removed.name} is no longer on the shop.` };

  const stored = storedOf(removed.stored);
  if (!fitsOffer(product.offer, stored, product.variants)) {
    return { ok: false, message: `The choices for ${product.name} have changed. Please choose again from its page.` };
  }

  return place(product, stored, clampQuantity(removed.quantity), now);
}
