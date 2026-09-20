"use server";

import { redirect } from "next/navigation";

import { authenticateAdmin } from "@/lib/auth/authenticate";
import { startSession } from "@/lib/auth/session-cookie";
import { db } from "@/lib/db";
import type { LoginState } from "@/components/admin/login-form";

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

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

  await db.adminUser.update({
    where: { id: session.userId },
    data: { lastLoginAt: new Date() },
  });

  await startSession(session);

  // redirect() signals by throwing, so it must sit outside any try/catch.
  redirect("/admin");
}
