/**
 * A shopper's sign-in cookie: its name and how long it lasts. Apart from the
 * token code, which needs jose, so the cookies page can say both from the
 * constants that set them.
 */

export const CUSTOMER_SESSION_COOKIE = "nyoki_customer_session";

// Longer than the CMS's week: a shopper comes back occasionally, and being
// signed out between visits is the friction that stops them.
export const CUSTOMER_SESSION_DAYS = 30;
