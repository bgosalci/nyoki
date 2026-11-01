import { BasketAddedProvider } from "@/components/shop/basket-added";
import { DepartmentNav } from "@/components/shop/department-nav";
import { HeaderIcons } from "@/components/shop/header-icons";
import { ShopFooter } from "@/components/shop/shop-footer";
import { ShopLogo } from "@/components/shop/shop-logo";
import { TopNav } from "@/components/shop/top-nav";
import { currentCustomer } from "@/lib/account/dal";
import { basketPieces } from "@/lib/basket/store";
import { orderingOpen } from "@/lib/ordering";
import { db } from "@/lib/db";
import { ui } from "@/lib/brand/ui";
import { departments } from "@/lib/storefront/queries";

/**
 * Storefront chrome. Deliberately light-only: the shop commits to one warm
 * look rather than following the viewer's theme, which is the admin's job.
 *
 * The header is two tiers, split by a sage rule: everything that is not
 * shopping above it, the departments themselves below.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Only whether somebody is signed in, so the header can point its account
  // icon at the right place. The pages inside the account do their own
  // checking; this is decoration.
  const shopper = await currentCustomer();
  const savedCount = shopper ? await db.favourite.count({ where: { customerId: shopper.id } }) : 0;
  // The basket is real only while ordering is open; closed, its icon says it is coming.
  const ordering = orderingOpen();
  const pieces = ordering ? await basketPieces() : 0;

  const groups = await departments();

  return (
    <BasketAddedProvider>
      <div className={`flex min-h-dvh flex-col ${ui.shopPage}`}>
        <header className={`sticky top-0 z-30 border-b ${ui.shopRule} ${ui.shopPage}`}>
          <div className="mx-auto max-w-shop px-4 sm:px-6">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-4 sm:gap-4">
              <TopNav />

              <ShopLogo />

              <HeaderIcons signedIn={shopper !== null} savedCount={savedCount} basket={ordering ? { pieces } : null} />
            </div>
          </div>

          <div className="mx-auto max-w-shop px-4 sm:px-6">
            <div className="border-t border-nyoki-sage" />
            <DepartmentNav groups={groups} />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <ShopFooter groups={groups} />
      </div>
    </BasketAddedProvider>
  );
}
