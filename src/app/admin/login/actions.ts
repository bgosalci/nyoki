"use server";

import { redirect } from "next/navigation";

import { authenticateAdmin, normaliseEmail } from "@/lib/auth/authenticate";
import { isKnownBrowser, rememberBrowser } from "@/lib/auth/known-browser";
import { startSession } from "@/lib/auth/session-cookie";
import { db } from "@/lib/db";
import { ADMIN_SIGN_IN_PER_ADDRESS, ADMIN_SIGN_IN_PER_EMAIL, WAIT_A_WHILE, attempt, emailKey, requestAddress } from "@/lib/rate-limit";
import type { LoginState } from "@/components/admin/login-form";

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Counted before the password is checked: checking costs a deliberately
  // slow hash, and a script trying passwords should not get to run it. The
  // same answer for any email, so it says nothing about which have accounts.
  // A browser that has signed in to this account before is let past the
  // email's limit (known-browser), or anyone could lock its owner out.
  const tried = normaliseEmail(email);
  const [address, known] = await Promise.all([requestAddress(), isKnownBrowser("admin", tried)]);
  const [fromHere, forEmail] = await Promise.all([
    attempt(ADMIN_SIGN_IN_PER_ADDRESS, address),
    known ? null : attempt(ADMIN_SIGN_IN_PER_EMAIL, emailKey(tried)),
  ]);
  if (fromHere.over || forEmail?.over) return { error: WAIT_A_WHILE, email };

  const session = await authenticateAdmin(email, password, {
    findAdminByEmail: (normalised) =>
      db.adminUser.findUnique({ where: { email: normalised } }),
  });

  // One message for every failure. Naming which half was wrong would confirm
  // to an attacker that an email address has a CMS account.
  if (!session) {
    return {
      error: "Those details are not right. Please try again.",
      // The password is deliberately not echoed back.
      email,
    };
  }

  // Only failures count: one that worked is taken back off.
  await Promise.all([fromHere.forget(), forEmail?.forget()]);

  await db.adminUser.update({
    where: { id: session.userId },
    data: { lastLoginAt: new Date() },
  });

  await startSession(session);
  await rememberBrowser("admin", session.email);

  // redirect() signals by throwing, so it must sit outside any try/catch.
  redirect("/admin");
}
