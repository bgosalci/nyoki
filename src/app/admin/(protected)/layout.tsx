import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/dal";
import { signOut } from "@/app/admin/(protected)/actions";

export const metadata: Metadata = {
  title: "Nyoki admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The real guard. The proxy redirect is only an optimistic convenience.
  const session = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col justify-between border-b border-black/10 p-4 md:w-60 md:border-r md:border-b-0 dark:border-white/10">
        <div>
          <p className="px-3 pb-4 text-lg font-semibold tracking-tight">Nyoki</p>
          <AdminNav />
        </div>

        <div className="mt-6 border-t border-black/10 px-3 pt-4 dark:border-white/10">
          <p className="truncate text-xs text-black/50 dark:text-white/50">
            {session.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-2 text-sm text-black/70 underline underline-offset-4 hover:text-black dark:text-white/70 dark:hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
