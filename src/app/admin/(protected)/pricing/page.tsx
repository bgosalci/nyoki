import { PricingFilterForm } from "@/components/admin/pricing-filter-form";
import { PricingTable } from "@/components/admin/pricing-table";
import { repriceProducts } from "@/app/admin/(protected)/products/actions";
import { ui } from "@/lib/brand/ui";
import { inView, parsePricingView, pricingRow, pricingSummary } from "@/lib/costing/list";
import { db } from "@/lib/db";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, view } = parsePricingView(await searchParams);

  // Archived pieces are not for sale, so there is nothing to price.
  const products = await db.product.findMany({
    where: { status: { not: "ARCHIVED" } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      pricePence: true,
      vatRate: true,
      images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      costLines: { select: { unitPence: true, quantityHundredths: true } },
    },
  });

  const all = products.map((product) => pricingRow({ ...product, image: product.images[0] ?? null }));
  // The summary is of the whole shop, whatever the search, so it can be read
  // as a to-do list: how much is left to cost, and what is losing money.
  const summary = pricingSummary(all);

  const needle = q.toLowerCase();
  const rows = all.filter((row) => inView(row, view) && (needle.length === 0 || row.name.toLowerCase().includes(needle)));

  const header = (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Pricing</h1>
      <p className={`mt-2 text-sm ${ui.mutedOnPage}`}>
        {summary.costed} of {summary.total} pieces costed
        {summary.atALoss > 0 ? ` · ${summary.atALoss} selling at a loss` : ""}
      </p>
      <PricingFilterForm initialQ={q} initialView={view} />
      <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>
        {rows.length === all.length ? `${rows.length} pieces` : `${rows.length} of ${all.length} pieces`}
      </p>
    </>
  );

  return rows.length > 0 ? (
    <PricingTable rows={rows} header={header} reprice={repriceProducts} />
  ) : (
    <>
      {header}
      <p className={`mt-8 text-sm ${ui.mutedOnPage}`}>Nothing matches that. Try a shorter search, or show everything.</p>
    </>
  );
}
