/**
 * The products list address for a filter. A plain module, so both the client
 * filter form and the server-rendered category pills can build links from it.
 */
export function filterHref(pathname: string, { q, status, category }: { q: string; status: string; category: string }): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
