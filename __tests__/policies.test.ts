/**
 * @jest-environment node
 */
import { SESSION_COOKIE } from "@/lib/auth/session";
import { CUSTOMER_SESSION_COOKIE, CUSTOMER_SESSION_DAYS, KNOWN_BROWSER_COOKIE, KNOWN_BROWSER_DAYS } from "@/lib/account/cookie";
import { ADMIN_KNOWN_BROWSER_COOKIE } from "@/lib/auth/known-browser";
import { BASKET_COOKIE, BASKET_COOKIE_DAYS } from "@/lib/basket/cookie";
import { BUSINESS, formatVatNumber } from "@/lib/policies/business";
import { SITE_COOKIES, lasts } from "@/lib/policies/cookies";
import { deliveryOptions } from "@/lib/policies/delivery";
import { POLICIES, policyHref } from "@/lib/policies/pages";
import type { RateSource } from "@/lib/delivery/parcel";

describe("the policies", () => {
  it("are the five pages a shop must have, and how reviews are handled, each under /policies", () => {
    expect(POLICIES.map((policy) => policy.title)).toEqual([
      "Delivery",
      "Returns and refunds",
      "Terms and conditions",
      "Privacy notice",
      "Cookies",
      "Reviews",
    ]);
    expect(POLICIES.map((policy) => policyHref(policy))).toEqual([
      "/policies/delivery",
      "/policies/returns",
      "/policies/terms",
      "/policies/privacy",
      "/policies/cookies",
      "/policies/reviews",
    ]);
  });
});

describe("the business", () => {
  it("is the company on the register, trading as the shop's name", () => {
    expect(BUSINESS).toMatchObject({
      tradingName: "Nyoki Handmade",
      legalName: "Nyoki Limited",
      companyNumber: "06758218",
      registeredIn: "England and Wales",
      registeredOffice: ["82 Containerville", "1 Emma Street", "London", "E2 9FP"],
    });
  });

  it("is written to and sent returns at its trading address", () => {
    expect(BUSINESS.address).toEqual(["Unit 302", "3A Howick Place", "London", "SW1P 1WG"]);
  });

  it("writes a VAT number as HMRC does", () => {
    expect(formatVatNumber("979867325")).toBe("GB 979 8673 25");
    expect(formatVatNumber("GB 979 8673 25")).toBe("GB 979 8673 25");
  });
});

describe("the cookies page", () => {
  it("lists every cookie a shopper can be given, by the name the code sets it under", () => {
    expect(SITE_COOKIES.map((cookie) => cookie.name)).toEqual([BASKET_COOKIE, CUSTOMER_SESSION_COOKIE, KNOWN_BROWSER_COOKIE]);
  });

  it("leaves out the team's own cookies, which are never set for a shopper", () => {
    expect(SITE_COOKIES.map((cookie) => cookie.name)).not.toContain(SESSION_COOKIE);
    expect(SITE_COOKIES.map((cookie) => cookie.name)).not.toContain(ADMIN_KNOWN_BROWSER_COOKIE);
  });

  it("says each lasts as long as the code makes it last", () => {
    expect(SITE_COOKIES.map((cookie) => cookie.days)).toEqual([BASKET_COOKIE_DAYS, CUSTOMER_SESSION_DAYS, KNOWN_BROWSER_DAYS]);
    expect([BASKET_COOKIE_DAYS, CUSTOMER_SESSION_DAYS, KNOWN_BROWSER_DAYS]).toEqual([60, 30, 365]);
  });

  it("says a cookie's life in words", () => {
    expect(lasts(60)).toBe("60 days");
    expect(lasts(7)).toBe("7 days");
    expect(lasts(1)).toBe("1 day");
  });
});

describe("deliveryOptions", () => {
  const rate = (over: Partial<RateSource>): RateSource => ({
    id: "r",
    name: "Royal Mail Tracked 48",
    pricePence: 395,
    byWeight: true,
    freeOverPence: null,
    minDays: 2,
    maxDays: 3,
    bands: [
      { size: "LARGE_LETTER", upToGrams: 1000, pricePence: 390 },
      { size: "SMALL_PARCEL", upToGrams: 2000, pricePence: 480 },
    ],
    ...over,
  });

  it("says an option free over nothing is free on every order", () => {
    expect(deliveryOptions([rate({ freeOverPence: 0 })])).toEqual([
      { name: "Royal Mail Tracked 48", cost: "Free on every order", time: "2 to 3 working days" },
    ]);
  });

  it("gives an option priced by size and weight from its cheapest price", () => {
    expect(deliveryOptions([rate({ name: "Royal Mail Tracked 24", minDays: 1, maxDays: 2 })])).toEqual([
      { name: "Royal Mail Tracked 24", cost: "From £3.90, by size and weight", time: "1 to 2 working days" },
    ]);
  });

  it("gives an option at one price that price", () => {
    expect(deliveryOptions([rate({ byWeight: false, pricePence: 350 })])[0].cost).toBe("£3.50");
    expect(deliveryOptions([rate({ byWeight: false, pricePence: 0 })])[0].cost).toBe("Free on every order");
  });

  it("says when an option goes free over a spend", () => {
    expect(deliveryOptions([rate({ byWeight: false, pricePence: 350, freeOverPence: 4000 })])[0].cost).toBe(
      "£3.50, free on orders over £40.00",
    );
    expect(deliveryOptions([rate({ freeOverPence: 4000 })])[0].cost).toBe("From £3.90 by size and weight, free on orders over £40.00");
  });

  it("leaves out an option with no prices yet, as checkout does", () => {
    expect(deliveryOptions([rate({ bands: [] }), rate({ name: "Royal Mail Tracked 24" })]).map((option) => option.name)).toEqual([
      "Royal Mail Tracked 24",
    ]);
  });

  it("leaves the time unsaid when the option does not say", () => {
    expect(deliveryOptions([rate({ minDays: null, maxDays: null })])[0].time).toBeNull();
  });
});
