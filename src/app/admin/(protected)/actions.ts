"use server";

import { redirect } from "next/navigation";

import { destroySession } from "@/lib/auth/session-cookie";

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}
