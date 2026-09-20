/**
 * @jest-environment node
 *
 * jose reaches for TextEncoder and WebCrypto, neither of which jsdom has.
 */

import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerToken,
  verifyCustomerToken,
} from "@/lib/account/session";
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/auth/session";

const SECRET = "a-secret-long-enough-to-be-a-real-hs256-key";
const OTHER = "another-secret-long-enough-to-be-a-real-key";

const session = { customerId: "c1", email: "someone@example.com" };

describe("customer session tokens", () => {
  it("carries the customer back out again", async () => {
    const token = await createCustomerToken(session, SECRET);

    expect(await verifyCustomerToken(token, SECRET)).toEqual(session);
  });

  it("refuses a token signed by somebody else", async () => {
    const token = await createCustomerToken(session, OTHER);

    expect(await verifyCustomerToken(token, SECRET)).toBeNull();
  });

  it("refuses a token that has been tampered with", async () => {
    const token = await createCustomerToken(session, SECRET);
    const [header, , signature] = token.split(".");
    const forged = `${header}.${btoa(JSON.stringify({ customerId: "c2", email: "x@y.z" }))}.${signature}`;

    expect(await verifyCustomerToken(forged, SECRET)).toBeNull();
  });

  it("refuses a token that has run out", async () => {
    const token = await createCustomerToken(session, SECRET);
    const wellPastExpiry = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000);

    expect(await verifyCustomerToken(token, SECRET, { now: wellPastExpiry })).toBeNull();
  });

  it("refuses nonsense without throwing", async () => {
    expect(await verifyCustomerToken("", SECRET)).toBeNull();
    expect(await verifyCustomerToken("not.a.jwt", SECRET)).toBeNull();
  });
});

describe("the two kinds of session cannot be mistaken for each other", () => {
  // Both are signed with the same secret, so a valid signature proves only
  // that we issued it - not what we issued it for. Getting this wrong would
  // let a customer cookie open the CMS.
  it("will not accept a CMS token as a customer", async () => {
    const admin = await createSessionToken({ userId: "a1", email: "staff@nyoki.co.uk", role: "OWNER" }, SECRET);

    expect(await verifyCustomerToken(admin, SECRET)).toBeNull();
  });

  it("will not accept a customer token as CMS staff", async () => {
    const customer = await createCustomerToken(session, SECRET);

    expect(await verifySessionToken(customer, SECRET)).toBeNull();
  });

  it("keeps the two cookies apart, so one cannot overwrite the other", () => {
    expect(CUSTOMER_SESSION_COOKIE).not.toBe(SESSION_COOKIE);
  });
});
