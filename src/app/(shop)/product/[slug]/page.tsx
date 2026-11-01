import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGrid } from "@/components/shop/product-grid";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { toggleFavourite } from "@/app/(shop)/account/actions";
import { FavouriteButton } from "@/components/shop/favourite-button";
import { currentCustomer } from "@/lib/account/dal";
import { formatPence } from "@/lib/money";
import { effectivePricePence } from "@/lib/pricing";
import { shopTrail } from "@/lib/categories/visibility";
import { neverRunsOut } from "@/lib/products/stock-limit";
import { addToBasket } from "@/app/(shop)/basket/actions";
import { BuyBar } from "@/components/shop/buy-bar";
import { CustomiserBar, CustomiserPanels, CustomiserProvider } from "@/components/shop/customiser";
import { Disclosure } from "@/components/shop/disclosure";
import { ASK_ID, AskLink, QuestionForm } from "@/components/shop/question-form";
import { askQuestion } from "@/app/(shop)/contact/actions";
import { PlainText } from "@/components/shop/plain-text";
import { ProductLayout } from "@/components/shop/product-layout";
import { RichText } from "@/components/shop/rich-text";
import { productFacts } from "@/lib/storefront/facts";
import { offersAnything } from "@/lib/customisation/offer";
import { orderingOpen } from "@/lib/ordering";
import { productOffer } from "@/lib/storefront/offer";
import { summaryOf } from "@/lib/rich-text/parse";
import { alsoLike } from "@/lib/products/also-like";
import { automaticAlsoLike, CARD_SELECT, toCards } from "@/lib/storefront/queries";

async function findProduct(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" }, select: { colour: true, size: true, stock: true } },
      categories: { select: { categoryId: true } },
      sales: { select: { sale: true } },
      customisation: true,
      personalisationFields: true,
      packs: true,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  return {
    title: product?.name ?? "Not found",
    description: summaryOf(product?.description ?? ""),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await findProduct((await params).slug);
  if (!product) notFound();

  const sales = product.sales.map((link) => link.sale);
  const shopper = await currentCustomer();
  const saved =
    shopper !== null &&
    (await db.favourite.findUnique({
      where: { customerId_productId: { customerId: shopper.id, productId: product.id } },
      select: { productId: true },
    })) !== null;

  const price = effectivePricePence(product.pricePence, sales, new Date());

  const categoryIds = product.categories.map((link) => link.categoryId);
  const [categories, chosen, automatic] = await Promise.all([
    db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true, active: true } }),
    // Njomza's own choices, in her order; one taken off the shop is skipped.
    db.alsoLike.findMany({
      where: { productId: product.id, piece: { status: "ACTIVE" } },
      orderBy: { position: "asc" },
      select: { piece: { select: CARD_SELECT } },
    }),
    // Pieces from the same categories, to fill whatever she has not chosen.
    automaticAlsoLike(product.id, categoryIds),
  ]);
  const related = alsoLike({ chosen: chosen.map((link) => link.piece), automatic });

  // A card or bookmark with something to choose, or clothing in colours or
  // sizes, shows its choices. The basket prices a line by this same offer.
  const { offer, clothes } = productOffer({ ...product, sales, categoryIds }, categories, new Date());
  const customising = offersAnything(offer);

  // While ordering is open every piece is bought the same way - its choices,
  // if any, how many, and the bar with the total and Add to basket - so a
  // piece with nothing to choose has just the quantity. Closed, such a piece
  // keeps the phone's buy bar, saying ordering opens soon.
  const ordering = orderingOpen();
  const withBar = customising || ordering;

  // Clothing is told by its colours and sizes; any dimensions it kept from
  // before are out of sight in the admin, so they stay off the page too.
  const facts = productFacts({ ...product, dimensions: clothes ? null : product.dimensions });

  // Through its first category on the shop: one taken off has no page to lead to.
  const trail = shopTrail(categories, categoryIds);
  const wasPence = price.sale ? product.pricePence : product.compareAtPence;

  const [mainImage, ...moreImages] = product.images;
  const photo = (image: (typeof product.images)[number], index: number) => (
    <div key={image.id} className="relative aspect-square w-full overflow-hidden rounded-lg bg-nyoki-soft-ash">
      <Image
        src={image.url}
        alt={image.alt ?? (index === 0 ? product.name : "")}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        priority={index === 0}
        className="object-cover"
      />
    </div>
  );

  const page = (
    <div className="mx-auto max-w-shop px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb">
        <ol className={`flex flex-wrap items-center gap-2 text-sm font-medium tracking-[0.1em] uppercase ${ui.shopMuted}`}>
          <li><Link href="/shop" className="hover:underline hover:underline-offset-4">Shop</Link></li>
          {trail.map((crumb) => (
            <li key={crumb.id} className="flex items-center gap-2">
              <span aria-hidden="true">/</span>
              <Link href={`/shop/${crumb.slug}`} className="hover:underline hover:underline-offset-4">{crumb.name}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <ProductLayout
        pinDetails={!customising}
        mainPhoto={mainImage ? photo(mainImage, 0) : null}
        morePhotos={
          moreImages.length > 0 ? (
            <div className="flex flex-col gap-3">{moreImages.map((image, index) => photo(image, index + 1))}</div>
          ) : null
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className={`text-3xl leading-tight tracking-tight ${ui.shopHeading}`}>{product.name}</h1>
            {/* On a phone the price is in the bar at the bottom of the screen. */}
            <p className="hidden items-baseline gap-3 text-xl tabular-nums md:flex">
              {formatPence(price.pricePence)}
              {wasPence !== null ? (
                <>
                  <span className="sr-only">was</span>
                  <s className={`text-base ${ui.shopMuted}`}>{formatPence(wasPence)}</s>
                </>
              ) : null}
            </p>
            {price.sale ? (
              <p className={`self-start px-2 py-1 text-xs tracking-wider uppercase ${ui.shopBand}`}>{price.sale.name}</p>
            ) : null}
          </div>

          {product.description ? (
            <RichText text={product.description} className={`leading-relaxed ${ui.shopMuted}`} />
          ) : null}

          <ul className={`flex flex-wrap gap-2 text-xs tracking-wider uppercase`}>
            {product.oneOfAKind ? <li className={`px-2 py-1 ${ui.shopBand}`}>One of a kind</li> : null}
            {product.madeToOrder ? (
              <li className={`px-2 py-1 ${ui.shopBadge}`}>
                Made to order{product.leadTimeDays ? ` · ${product.leadTimeDays} days` : ""}
              </li>
            ) : null}
          </ul>

          {/* What can be chosen, once the piece has been described. */}
          {withBar ? <CustomiserPanels /> : null}

          {facts.length > 0 ? (
            <Disclosure title="Need to know" className={`border-t pt-4 ${ui.shopRule}`}>
              <dl className="mt-4 flex flex-col gap-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="grid grid-cols-[6rem_1fr] gap-3">
                    <dt className={`text-xs tracking-[0.1em] uppercase ${ui.shopMuted}`}>{fact.label}</dt>
                    <dd>
                      {fact.rich ? (
                        <RichText text={fact.value} className={`text-sm leading-relaxed ${ui.shopMuted}`} />
                      ) : (
                        <PlainText text={fact.value} className={`text-sm leading-relaxed ${ui.shopMuted}`} />
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Disclosure>
          ) : null}

          {/* Named in some pieces' own details ("use 'Ask a question' below"). */}
          <Disclosure id={ASK_ID} title="Ask a question" className={`border-t pt-4 ${ui.shopRule}`}>
            <p className={`mt-4 mb-4 text-sm leading-relaxed ${ui.shopMuted}`}>
              About this piece, a size you cannot see, or an order for a gift. We will reply by email.
            </p>
            <QuestionForm
              action={askQuestion}
              productId={product.id}
              shopper={shopper ? { name: shopper.name, email: shopper.email } : undefined}
            />
          </Disclosure>

          <div className={`flex items-center gap-3 border-t pt-5 ${ui.shopRule}`}>
            <FavouriteButton
              productId={product.id}
              name={product.name}
              saved={saved}
              signedIn={shopper !== null}
              toggle={toggleFavourite}
              className="border border-nyoki-light-slate"
            />
            <span className={`text-sm ${ui.shopMuted}`}>
              {saved ? "Saved to your account" : "Save this for later"}
            </span>
          </div>

          {ordering ? null : (
            <p className={`text-sm ${ui.shopMuted}`}>
              Online ordering is coming soon. In the meantime, <AskLink>send us a question</AskLink> to buy this piece.
            </p>
          )}
        </div>
      </ProductLayout>

      {related.length > 0 ? (
        <section className="mt-20">
          <h2 className={`text-2xl tracking-tight ${ui.shopHeading}`}>You may also like</h2>
          <div className="mt-8">
            <ProductGrid products={toCards(related)} />
          </div>
        </section>
      ) : null}

      {/* Last, so it holds to the bottom of the screen over the whole page. */}
      {withBar ? <CustomiserBar /> : <BuyBar pricePence={price.pricePence} wasPence={wasPence} />}
    </div>
  );

  return withBar ? (
    <CustomiserProvider
      offer={offer}
      productId={product.id}
      add={ordering ? addToBasket : undefined}
      // How many there are of anything that is not clothing - clothing's stock
      // is in its offer. Made to order, or on order, never runs out.
      stock={neverRunsOut(product) ? null : product.stock}
      oneOfAKind={product.oneOfAKind}
    >
      {page}
    </CustomiserProvider>
  ) : (
    page
  );
}
