"use server";

import { redirect } from "next/navigation";

import { authenticateAdmin, normaliseEmail } from "@/lib/auth/authenticate";
import { startSession } from "@/lib/auth/session-cookie";
import { db } from "@/lib/db";
import {
  ADMIN_SIGN_IN_PER_ADDRESS,
  ADMIN_SIGN_IN_PER_EMAIL,
  WAIT_A_WHILE,
  isLimited,
  recordAttempt,
  requestAddress,
} from "@/lib/rate-limit";
import type { LoginState } from "@/components/admin/login-form";

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Refused before the password is checked: checking costs a deliberately
  // slow hash, and a script trying passwords should not get to run it. The
  // same answer for any email, so it says nothing about which have accounts.
  const address = await requestAddress();
  const tried = normaliseEmail(email);
  if ((await isLimited(ADMIN_SIGN_IN_PER_ADDRESS, address)) || (await isLimited(ADMIN_SIGN_IN_PER_EMAIL, tried))) {
    return { error: WAIT_A_WHILE, email };
  }

  const session = await authenticateAdmin(email, password, {
    findAdminByEmail: (normalised) =>
      db.adminUser.findUnique({ where: { email: normalised } }),
  });

  // One message for every failure. Naming which half was wrong would confirm
  // to an attacker that an email address has a CMS account.
  if (!session) {
    await recordAttempt(ADMIN_SIGN_IN_PER_ADDRESS, address);
    await recordAttempt(ADMIN_SIGN_IN_PER_EMAIL, tried);
    return {
      error: "Those details are not right. Please try again.",
      // The password is deliberately not echoed back.
      email,
    };
  }

  await db.adminUser.update({
    where: { id: session.userId },
    data: { lastLoginAt: new Date() },
  });

  await startSession(session);

  // redirect() signals by throwing, so it must sit outside any try/catch.
  redirect("/admin");
}
