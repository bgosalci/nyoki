import "server-only";

import { headers } from "next/headers";

/**
 * Whether the browser says this request was started from another website - a
 * link, a redirect or a form there (Sec-Fetch-Site, which every current
 * browser sends and no page can set). "same-site" counts as elsewhere too: a
 * subdomain is not the shop. A browser that says nothing is given the benefit
 * of the doubt, since every one in use today does say.
 */
export async function cameFromElsewhere(): Promise<boolean> {
  const site = (await headers()).get("sec-fetch-site");
  return site === "cross-site" || site === "same-site";
}
