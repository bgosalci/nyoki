/**
 * The cookie that names a guest's basket. Apart from the store, which is
 * server-only, so the cookies page can say what it is called and how long it
 * lasts from the same constants that set it.
 */

export const BASKET_COOKIE = "nyoki_basket";

// Long, as a shopper's session is: a basket filled in November is often
// bought from in December.
export const BASKET_COOKIE_DAYS = 60;
