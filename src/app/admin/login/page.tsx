import { ui } from "@/lib/brand/ui";
import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";
import { login } from "@/app/admin/login/actions";

export const metadata: Metadata = {
  title: "Sign in · Nyoki",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Nyoki</h1>
        <p className={`mt-1 text-sm ${ui.mutedOnPage}`}>
          Sign in to manage the shop.
        </p>
      </div>

      <LoginForm action={login} />
    </main>
  );
}
