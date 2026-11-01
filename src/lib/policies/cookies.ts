import { ADMIN_SESSION_DAYS, SESSION_COOKIE } from "@/lib/auth/cookie";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_DAYS } from "@/lib/account/cookie";
import { BASKET_COOKIE, BASKET_COOKIE_DAYS } from "@/lib/basket/cookie";

/**
 * Every cookie the site sets, for the cookies page: named and timed by the
 * same constants that set them, so the page cannot fall behind the code.
 * Each is strictly necessary - the shop does not work without it - which is
 * why the law asks no consent for them and the shop shows no banner.
 */

export interface SiteCookie {
  name: string;
  purpose: string;
  days: number;
}

export const SITE_COOKIES: readonly SiteCookie[] = [
  {
    name: BASKET_COOKIE,
    purpose: "Remembers what is in your basket while you are not signed in.",
    days: BASKET_COOKIE_DAYS,
  },
  {
    name: CUSTOMER_SESSION_COOKIE,
    purpose: "Keeps you signed in to your account, if you have one, until you sign out.",
    days: CUSTOMER_SESSION_DAYS,
  },
  {
    name: SESSION_COOKIE,
    purpose: "Keeps our own team signed in while they run the shop. Never set for shoppers.",
    days: ADMIN_SESSION_DAYS,
  },
];

/** How long a cookie lasts, in words: "60 days". */
export function lasts(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}
