"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DetailsState } from "@/components/shop/details-form";
import type { PasswordState } from "@/components/shop/password-form";
import type { RegisterState } from "@/components/shop/register-form";
import type { SignInState } from "@/components/shop/sign-in-form";
import { authenticateCustomer } from "@/lib/account/authenticate";
import { requireCustomer } from "@/lib/account/dal";
import { afterSignIn } from "@/lib/account/next";
import { startCustomerSession } from "@/lib/account/session-cookie";
import {
  validateCustomerDetails,
  validateCustomerPasswordChange,
  validateRegistration,
  validateSignIn,
} from "@/lib/account/validate";
import { normaliseEmail } from "@/lib/auth/authenticate";
import { isKnownBrowser, rememberBrowser } from "@/lib/auth/known-browser";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isUniqueViolationOn } from "@/lib/db-errors";
import { db } from "@/lib/db";
import {
  REGISTER_PER_ADDRESS,
  SIGN_IN_PER_ADDRESS,
  SIGN_IN_PER_EMAIL,
  WAIT_A_WHILE,
  attempt,
  emailKey,
  requestAddress,
} from "@/lib/rate-limit";

const TAKEN = "That email already has an account. Sign in instead.";

/**
 * Create a shopper account.
 *
 * An email already in the table without a password is a guest row from
 * checkout, not an account: it gains one rather than a second identity being
 * created beside it, so the orders placed as a guest stay attached.
 *
 * Saying plainly that an email is taken does tell an enumerator that it is
 * registered. The alternative - accepting everything and settling it by
 * email - needs email we cannot yet send, and would leave somebody who simply
 * forgot they had an account with no way forward.
 */
export async function register(_state: RegisterState, formData: FormData): Promise<RegisterState> {
  const result = validateRegistration(formData);

  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };

  if (!result.ok) return { errors: result.errors, values };

  // Each registration costs a deliberately slow hash, and a script making
  // accounts by the hundred is nobody shopping.
  const fromHere = await attempt(REGISTER_PER_ADDRESS, await requestAddress());
  if (fromHere.over) return { errors: { email: WAIT_A_WHILE }, values };

  const { name, email, password } = result.data;
  const passwordHash = await hashPassword(password);

  let id: string;

  try {
    const existing = await db.customer.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    if (existing?.passwordHash) return { errors: { email: TAKEN }, values };

    const customer = existing
      ? await db.customer.update({ where: { id: existing.id }, data: { name, passwordHash } })
      : await db.customer.create({ data: { email, name, passwordHash } });

    id = customer.id;
  } catch (error) {
    // Two registrations for the same address at once: the second loses the
    // race to the unique index, and reads as taken like any other.
    if (isUniqueViolationOn(error, { table: "customers", column: "email" })) {
      return { errors: { email: TAKEN }, values };
    }
    throw error;
  }

  await startCustomerSession({ customerId: id, email });
  await rememberBrowser("shopper", email);

  // redirect() signals by throwing, so it must sit outside the try/catch.
  redirect("/account");
}

export async function signIn(_state: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");

  const result = validateSignIn(formData);

  // Counted before the account is looked up or its slow hash checked, with
  // the same answer for any email, so it says nothing about which exist. A
  // browser that has signed in to the account before is let past the email's
  // limit (known-browser), or anyone could lock its owner out.
  const tried = normaliseEmail(email);
  const [address, known] = await Promise.all([requestAddress(), isKnownBrowser("shopper", tried)]);
  const [fromHere, forEmail] = await Promise.all([
    attempt(SIGN_IN_PER_ADDRESS, address),
    known ? null : attempt(SIGN_IN_PER_EMAIL, emailKey(tried)),
  ]);
  if (fromHere.over || forEmail?.over) return { error: WAIT_A_WHILE, email };

  const session = result.ok
    ? await authenticateCustomer(result.data.email, result.data.password, {
        findCustomerByEmail: (normalised) =>
          db.customer.findUnique({
            where: { email: normalised },
            select: { id: true, email: true, passwordHash: true },
          }),
      })
    : null;

  // One message for every failure. Naming which half was wrong would confirm
  // that an address is registered.
  if (!session) return { error: "Those details are not right. Please try again.", email };

  // Only failures count: one that worked is taken back off.
  await Promise.all([fromHere.forget(), forEmail?.forget()]);
  await startCustomerSession(session);
  await rememberBrowser("shopper", session.email);

  // Back to checkout or the basket, when signing in was asked for there.
  const next = formData.get("next");
  redirect(afterSignIn(typeof next === "string" ? next : null));
}

/** Change the name the shop uses and the address it signs you in with. */
export async function updateDetails(_state: DetailsState, formData: FormData): Promise<DetailsState> {
  const shopper = await requireCustomer();

  const result = validateCustomerDetails(formData);
  if (!result.ok) return { errors: result.errors };

  try {
    await db.customer.update({
      where: { id: shopper.id },
      data: { name: result.data.name, email: result.data.email },
    });
  } catch (error) {
    if (isUniqueViolationOn(error, { table: "customers", column: "email" })) {
      return { errors: { email: "That email is already in use." } };
    }
    throw error;
  }

  // The session cookie carries the old address, but nothing reads it: the
  // shopper is looked up live by id on every request.
  revalidatePath("/account");

  return { errors: {}, saved: true };
}

export async function changePassword(_state: PasswordState, formData: FormData): Promise<PasswordState> {
  const shopper = await requireCustomer();

  const result = validateCustomerPasswordChange(formData);
  if (!result.ok) return { errors: result.errors };

  const account = await db.customer.findUnique({
    where: { id: shopper.id },
    select: { passwordHash: true },
  });

  const matches = account?.passwordHash
    ? await verifyPassword(result.data.currentPassword, account.passwordHash)
    : false;

  if (!matches) return { errors: { currentPassword: "That is not your current password." } };

  // A password is changed because someone else may know it, so every
  // session signed before now stops working, wherever it is - and this one
  // is signed afresh, so the shopper who changed it stays signed in.
  await db.customer.update({
    where: { id: shopper.id },
    data: { passwordHash: await hashPassword(result.data.newPassword), sessionsValidFrom: new Date() },
  });
  await startCustomerSession({ customerId: shopper.id, email: shopper.email });

  return { errors: {}, changed: true };
}

/**
 * Save a piece, or take it off the list.
 *
 * Written as a delete-then-create rather than a read-then-branch so that two
 * quick clicks cannot collide: deleteMany does not mind finding nothing, and
 * createMany skips a duplicate instead of throwing.
 */
export async function toggleFavourite(productId: string): Promise<void> {
  const shopper = await requireCustomer();

  const removed = await db.favourite.deleteMany({ where: { customerId: shopper.id, productId } });

  if (removed.count === 0) {
    await db.favourite.createMany({
      data: { customerId: shopper.id, productId },
      skipDuplicates: true,
    });
  }

  revalidatePath("/account/favourites");
  revalidatePath("/account");
}
