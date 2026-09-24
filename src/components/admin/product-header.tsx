import { ProductTabs } from "@/components/admin/product-tabs";
import { SaveSlot } from "@/components/admin/save-slot";
import { ui } from "@/lib/brand/ui";

/**
 * A product's name, its Save and its Details and Price tabs, pinned beneath
 * the admin's top bar while the page scrolls: the tabs are how you move
 * about a product, and Save is what you came to press. It paints the page's
 * ground so the form passes beneath it, and runs to the edges of the page's
 * padding so nothing shows either side.
 */
export function ProductHeader({ productId, name }: { productId: string; name: string }) {
  return (
    <div data-pinned className={`sticky top-14 z-20 -mx-6 px-6 pt-3 md:-mx-10 md:px-10 ${ui.page}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
        {/* Each tab's form puts its Save here. */}
        <SaveSlot />
      </div>
      <ProductTabs productId={productId} />
    </div>
  );
}
