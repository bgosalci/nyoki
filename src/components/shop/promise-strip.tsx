import { ui } from "@/lib/brand/ui";

const PROMISES = [
  "Every piece touched by human hands",
  "Eco-friendly, organic and recyclable",
  "Materials sourced in the UK",
];

/**
 * The three things true of everything in the shop.
 *
 * It sits at the foot of the browsing pages rather than only on the home
 * page: a shopper who arrives on a category from a search has not seen it.
 */
export function PromiseStrip() {
  return (
    <section className={`border-y ${ui.shopRule} bg-nyoki-sage text-nyoki-ink`}>
      <ul className="mx-auto grid max-w-shop gap-4 px-4 py-8 text-center text-sm sm:grid-cols-3 sm:px-6">
        {PROMISES.map((promise) => (
          <li key={promise}>{promise}</li>
        ))}
      </ul>
    </section>
  );
}
