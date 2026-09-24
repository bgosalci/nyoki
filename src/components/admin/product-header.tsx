import { ProductTabs } from "@/components/admin/product-tabs";
import { SaveSlot } from "@/components/admin/save-slot";
import { ui } from "@/lib/brand/ui";

/**
 * A product's header, pinned beneath the admin's top bar while the page
 * scrolls: the way back and Previous and Next, the name and its Save, and
 * the Details and Price tabs - everything for moving about a product, and
 * what you came to press. It paints the page's
 * ground so the form passes beneath it, and runs to the edges of the page's
 * padding so nothing shows either side.
 */
export function ProductHeader({ productId, name, steps }: { productId: string; name: string; steps?: React.ReactNode }) {
  return (
    <div data-pinned className={`sticky top-14 z-20 -mx-6 flex flex-col gap-3 px-6 pt-3 md:-mx-10 md:px-10 ${ui.page}`}>
      {steps}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
        {/* Each tab's form puts its Save here. */}
        <SaveSlot />
      </div>
      <ProductTabs productId={productId} />
    </div>
  );
}
