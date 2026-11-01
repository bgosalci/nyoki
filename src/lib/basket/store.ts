import "server-only";

import { cookies } from "next/headers";

import { currentCustomer } from "@/lib/account/dal";
import type { StoredChoices, VariantRow } from "@/lib/basket/lines";
import { reviewBasket, type BasketReview, type ReviewLine, type ReviewProduct } from "@/lib/basket/review";
import type { MessageChoice } from "@/lib/customisation/choices";
import type { DeliveryRate } from "@/lib/checkout/totals";
import { db } from "@/lib/db";
import { parcelOf, postageOf, priceRates, withUsual, type PricedRate } from "@/lib/delivery/parcel";
import type { ParcelSize } from "@/lib/delivery/royal-mail";
import { deliverySettings, postageCategories, rateSources } from "@/lib/delivery/store";
import { usualFor, type UsualCategory } from "@/lib/delivery/usual";
import type { PricedLine } from "@/lib/basket/review";
import { effectivePricePence, type PricingSale } from "@/lib/pricing";
import { productOffer, type OfferSource } from "@/lib/storefront/offer";

/**
 * Where the basket is kept: a row per basket, a row per line.
 *
 * A guest's basket is named by an httpOnly cookie. A signed-in shopper's is
 * joined to their account, so it follows them from computer to phone; what
 * they added while signed out is folded into it the next time the basket is
 * looked at, which covers signing in and registering alike.
 */

export const BASKET_COOKIE = "nyoki_basket";

// Long, as a shopper's session is: a basket filled in November is often
// bought from in December.
const BASKET_COOKIE_MS = 60 * 24 * 60 * 60 * 1000;

/** Everything about a piece the basket prices it by - the product page's own. */
export const BASKET_PRODUCT = {
  images: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
  variants: { orderBy: { position: "asc" }, select: { id: true, colour: true, size: true, stock: true, sku: true, name: true } },
  categories: { select: { categoryId: true } },
  sales: { select: { sale: true } },
  customisation: true,
  personalisationFields: true,
  packs: true,
} as const;

export interface BasketProductRow extends Omit<OfferSource, "sales" | "categoryIds" | "variants"> {
  id: string;
  slug: string;
  name: string;
  status: ReviewProduct["status"];
  sku: string | null;
  stock: number;
  oneOfAKind: boolean;
  leadTimeDays: number | null;
  vatRate: number;
  weightGrams: number | null;
  parcelSize: ParcelSize | null;
  thicknessMm: number | null;
  images: { url: string }[];
  variants: VariantRow[];
  categories: { categoryId: string }[];
  sales: { sale: PricingSale & { name: string } }[];
}

/** The categories, with what each says about a piece: what kind it is, and its usual postage. */
export type BasketCategory = UsualCategory;

export function toReviewProduct(row: BasketProductRow, categories: readonly BasketCategory[], now: Date): ReviewProduct {
  const sales = row.sales.map((link) => link.sale);
  const categoryIds = row.categories.map((link) => link.categoryId);
  const { offer } = productOffer({ ...row, sales, categoryIds }, categories, now);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    sku: row.sku,
    image: row.images[0]?.url ?? null,
    stock: row.stock,
    madeToOrder: row.madeToOrder,
    madeOnOrder: row.madeOnOrder,
    leadTimeDays: row.leadTimeDays,
    oneOfAKind: row.oneOfAKind,
    vatRate: row.vatRate,
    saleName: effectivePricePence(row.pricePence, sales, now).sale?.name ?? null,
    offer,
    variants: row.variants,
    postage: withUsual({ grams: row.weightGrams, size: row.parcelSize, mm: row.thicknessMm }, usualFor(categoryIds, categories)),
  };
}

export function categoryNodes(): Promise<BasketCategory[]> {
  return postageCategories();
}

async function readBasketCookie(): Promise<string | null> {
  return (await cookies()).get(BASKET_COOKIE)?.value ?? null;
}

/**
 * The basket the person looking has, or null. Safe while a page renders: it
 * writes nothing but the fold of a guest basket into an account.
 *
 * A guest basket already joined to an account is that account's, so a
 * signed-out visitor on a shared computer does not see it.
 */
export async function findBasketId(): Promise<string | null> {
  const [shopper, cookieId] = await Promise.all([currentCustomer(), readBasketCookie()]);
  const guest = cookieId
    ? await db.basket.findFirst({ where: { id: cookieId, customerId: null }, select: { id: true } })
    : null;

  if (!shopper) return guest?.id ?? null;

  const own = await db.basket.findUnique({ where: { customerId: shopper.id }, select: { id: true } });
  if (!guest) return own?.id ?? null;
  if (!own) {
    // Claimed only while it is still nobody's, so two requests at once cannot both take it.
    await db.basket.updateMany({ where: { id: guest.id, customerId: null }, data: { customerId: shopper.id } });
    return guest.id;
  }

  await foldInto(guest.id, own.id);
  return own.id;
}

/** Moves a guest basket's lines into an account's, adding to a line already there, then drops the guest basket. */
async function foldInto(guestId: string, ownId: string): Promise<void> {
  const lines = await db.basketLine.findMany({ where: { basketId: guestId }, orderBy: { createdAt: "asc" } });

  await db.$transaction([
    ...lines.map(({ id: _id, basketId: _basket, createdAt: _created, updatedAt: _updated, personalisation, ...line }) =>
      db.basketLine.upsert({
        where: { basketId_key: { basketId: ownId, key: line.key } },
        create: { ...line, personalisation: personalisation ?? {}, basketId: ownId },
        update: { quantity: { increment: line.quantity } },
      }),
    ),
    db.basket.deleteMany({ where: { id: guestId, customerId: null } }),
  ]);
}

/**
 * The basket to add to, made if there is none. Only for server actions: a
 * guest's new basket is named by setting the cookie, which a page cannot do.
 */
export async function basketIdForWriting(): Promise<string> {
  const existing = await findBasketId();
  if (existing) return existing;

  const shopper = await currentCustomer();
  if (shopper) {
    const basket = await db.basket.upsert({ where: { customerId: shopper.id }, create: { customerId: shopper.id }, update: {}, select: { id: true } });
    return basket.id;
  }

  const basket = await db.basket.create({ data: {}, select: { id: true } });
  (await cookies()).set(BASKET_COOKIE, basket.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + BASKET_COOKIE_MS),
  });
  return basket.id;
}

export function storedOf(line: {
  variantId: string | null;
  packId: string | null;
  message: string | null;
  messageText: string;
  personalise: boolean;
  personalisation: unknown;
}): StoredChoices {
  const personalisation = line.personalisation && typeof line.personalisation === "object" && !Array.isArray(line.personalisation)
    ? Object.fromEntries(Object.entries(line.personalisation).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : {};
  return {
    variantId: line.variantId,
    packId: line.packId,
    message: line.message === "Blank inside" || line.message === "Printed message" ? (line.message as MessageChoice) : null,
    messageText: line.messageText,
    personalise: line.personalise,
    personalisation,
  };
}

/** The basket's lines, in the order they went in, each with its piece as it stands now. */
export async function loadReviewLines(basketId: string, now: Date): Promise<ReviewLine[]> {
  const [rows, categories] = await Promise.all([
    db.basketLine.findMany({
      where: { basketId },
      orderBy: { createdAt: "asc" },
      include: { product: { include: BASKET_PRODUCT } },
    }),
    categoryNodes(),
  ]);

  return rows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    addedPricePence: row.addedPricePence,
    stored: storedOf(row),
    product: toReviewProduct(row.product as BasketProductRow, categories, now),
  }));
}

/**
 * The basket priced and checked afresh, with what changed written back - a
 * quantity cut to the stock, a line taken out, a new price remembered - so
 * each change is told once.
 */
export async function reviewAndSave(basketId: string, now = new Date()): Promise<BasketReview> {
  const review = reviewBasket(await loadReviewLines(basketId, now));

  if (review.updates.length > 0) {
    await db.$transaction(
      review.updates.map(({ id, remove, ...data }) =>
        remove ? db.basketLine.deleteMany({ where: { id, basketId } }) : db.basketLine.updateMany({ where: { id, basketId }, data }),
      ),
    );
  }

  return review;
}

export const EMPTY_REVIEW: BasketReview = { lines: [], changes: [], updates: [], pieces: 0, subtotalPence: 0 };

/** For the header: how many pieces are in the basket, as it was left. */
export async function basketPieces(): Promise<number> {
  const basketId = await findBasketId();
  if (!basketId) return 0;
  const sum = await db.basketLine.aggregate({ where: { basketId }, _sum: { quantity: true } });
  return sum._sum.quantity ?? 0;
}

/**
 * The delivery options a shopper can choose for these lines, each priced for
 * the parcel they make - an option whose price list has no band for it left
 * out - in the order set in the admin.
 */
export async function ratesFor(lines: readonly Pick<PricedLine, "postage" | "units">[]): Promise<PricedRate[]> {
  const [sources, settings] = await Promise.all([rateSources({ activeOnly: true }), deliverySettings()]);
  const parcel = parcelOf(lines.map((line) => ({ postage: postageOf(line.postage, settings), units: line.units })));
  return priceRates(sources, parcel, settings.packing);
}

/** The delivery options a shopper can choose, at their one prices: for what free delivery needs, which is the same whatever the parcel. */
export function activeRates(): Promise<DeliveryRate[]> {
  return db.shippingRate.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { pricePence: "asc" }],
    select: { id: true, name: true, pricePence: true, freeOverPence: true, minDays: true, maxDays: true },
  });
}
