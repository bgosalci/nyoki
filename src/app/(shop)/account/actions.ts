"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DetailsState } from "@/components/shop/details-form";
import type { PasswordState } from "@/components/shop/password-form";
import type { RegisterState } from "@/components/shop/register-form";
import type { SignInState } from "@/components/shop/sign-in-form";
import { authenticateCustomer } from "@/lib/account/authenticate";
import { requireCustomer } from "@/lib/account/dal";
import { startCustomerSession } from "@/lib/account/session-cookie";
import {
  validateCustomerDetails,
  validateCustomerPasswordChange,
  validateRegistration,
  validateSignIn,
} from "@/lib/account/validate";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isUniqueViolationOn } from "@/lib/db-errors";
import { db } from "@/lib/db";

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

  // redirect() signals by throwing, so it must sit outside the try/catch.
  redirect("/account");
}

export async function signIn(_state: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");

  const result = validateSignIn(formData);

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

  await startCustomerSession(session);

  redirect("/account");
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

  await db.customer.update({
    where: { id: shopper.id },
    data: { passwordHash: await hashPassword(result.data.newPassword) },
  });

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
