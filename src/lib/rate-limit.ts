import "server-only";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";

import { authSecret } from "@/lib/auth/secret";
import { db } from "@/lib/db";

/**
 * How often something may be tried before the shop asks the visitor to wait.
 *
 * Attempts are rows in the database (`RateLimitHit`) rather than counters in
 * memory, since Vercel runs the shop on many instances at once and a counter
 * in one knows nothing of the others. Each limit counts by what was tried
 * (its bucket) and who tried it: an email, or the address a request came
 * from, each kept only as a keyed hash.
 *
 * An attempt is written first and counted after (`attempt`), so requests
 * arriving together count each other. Checked first and written after, every
 * request in a burst read a count below the limit before any was written,
 * and 200 sign-ins sent at once all had their password checked.
 */

export interface Limit {
  bucket: string;
  /** Attempts allowed in the window; the next one waits. */
  max: number;
  windowMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Rows older than this can count towards no limit, and are deleted. */
const LONGEST_WINDOW_MS = 24 * HOUR;

/**
 * Failed sign-ins. Counted from one address, which stops a script trying
 * passwords; and against one email from anywhere, which slows one spread
 * across many addresses - except from a browser that has signed in to that
 * account before (`known-browser`), or anyone could lock its owner out by
 * failing twenty times an hour. Only failures count: a sign-in that works is
 * taken back off. The CMS's are its own, and tighter: it holds the shop.
 */
export const ADMIN_SIGN_IN_PER_ADDRESS: Limit = { bucket: "admin-sign-in:address", max: 10, windowMs: 15 * MINUTE };
export const ADMIN_SIGN_IN_PER_EMAIL: Limit = { bucket: "admin-sign-in:email", max: 20, windowMs: HOUR };
export const SIGN_IN_PER_ADDRESS: Limit = { bucket: "sign-in:address", max: 10, windowMs: 15 * MINUTE };
export const SIGN_IN_PER_EMAIL: Limit = { bucket: "sign-in:email", max: 30, windowMs: HOUR };

/** Accounts registered from one address. */
export const REGISTER_PER_ADDRESS: Limit = { bucket: "register:address", max: 10, windowMs: HOUR };

/**
 * Questions from one address, and from everyone together. The form's own
 * five an hour counts by the email typed, which a script simply changes.
 * Every question chimes on every open admin page, so the ceiling for all of
 * them together is what keeps a flood from drowning the real ones.
 */
export const QUESTIONS_PER_ADDRESS: Limit = { bucket: "question:address", max: 5, windowMs: HOUR };
export const QUESTIONS_IN_ALL: Limit = { bucket: "question:all", max: 60, windowMs: HOUR };

/**
 * Promo codes tried that did not work: codes are words, and words can be
 * guessed. One refused for its minimum spend is not a miss - the shopper can
 * act on it, and its message already says the code exists.
 */
export const CODE_MISSES_PER_ADDRESS: Limit = { bucket: "code:address", max: 10, windowMs: 15 * MINUTE };

/** The key a limit for everyone together counts under. */
export const EVERYONE = "everyone";

export interface Attempt {
  /** One more than the limit allows - counting this attempt, and any made at the same moment. */
  over: boolean;
  /** Takes this attempt back off the count: it turned out not to be one the limit is for. */
  forget(): Promise<void>;
}

/**
 * Writes an attempt, then counts the attempts in the limit's window, itself
 * included. Requests at the same moment each see the others' rows, so a burst
 * is refused rather than all let through; at worst, all of one that pushes
 * past the limit together are refused.
 */
export async function attempt(limit: Limit, key: string, now: Date = new Date()): Promise<Attempt> {
  const { id } = await db.rateLimitHit.create({ data: { bucket: limit.bucket, key, createdAt: now }, select: { id: true } });
  // An indexed delete of whatever has aged out, usually nothing: no job has
  // to remember to tidy the table.
  await db.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - LONGEST_WINDOW_MS) } } });

  const attempts = await db.rateLimitHit.count({
    where: { bucket: limit.bucket, key, createdAt: { gte: new Date(now.getTime() - limit.windowMs) } },
  });

  return {
    over: attempts > limit.max,
    forget: async () => {
      await db.rateLimitHit.deleteMany({ where: { id } });
    },
  };
}

/** A keyed hash, 32 hex characters, whatever was hashed: the key an attempt is kept by. */
function scrambled(kind: "address" | "email", text: string): string {
  return createHmac("sha256", authSecret()).update(`${kind}:${text}`).digest("hex").slice(0, 32);
}

/**
 * An email as a limit's key. Never the email itself: the raw text was once
 * the key - anything typed into the box, any length, stored and indexed - and
 * a random one past 2,704 bytes broke the index, so the sign-in answered with
 * a server error. Expects the email already normalised.
 */
export function emailKey(email: string): string {
  return scrambled("email", email);
}

/**
 * The address the request came from, as a keyed hash: enough to tell two
 * visitors apart for an hour, and nothing anyone could read an address back
 * out of. Vercel sets x-forwarded-for itself, first the visitor's address;
 * with neither header (a local server), everyone shares one key.
 */
export async function requestAddress(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || list.get("x-real-ip")?.trim() || "unknown";

  return scrambled("address", address);
}

/** What a visitor is told when a limit is reached. */
export const WAIT_A_WHILE = "That has been tried too many times. Please wait a while and try again.";
