import { ui } from "@/lib/brand/ui";
import { filterHref } from "@/lib/products/filter-href";

/**
 * Exports the products as a CSV file - as the list is filtered, so a file of
 * just the Christmas cards is one click from the Christmas cards.
 *
 * A plain link rather than next/link: it fetches a file, not a page.
 */
export function ExportLink({ q, status, category, count }: { q: string; status: string; category: string; count: number }) {
  const filtered = q.length > 0 || status.length > 0 || category.length > 0;

  return (
    <a
      href={filterHref("/admin/products/export", { q, status, category })}
      download
      title={`${filtered ? `These ${count}` : `All ${count}`} ${count === 1 ? "product" : "products"}, as a spreadsheet file`}
      className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonSecondary}`}
    >
      Export CSV
    </a>
  );
}
