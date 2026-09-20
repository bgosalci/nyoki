import type { Metadata } from "next";

import { AdminFooter } from "@/components/admin/admin-footer";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { requireAdmin } from "@/lib/auth/dal";
import { ui } from "@/lib/brand/ui";
import { signOut } from "@/app/admin/(protected)/actions";

export const metadata: Metadata = {
  title: "Nyoki admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The real guard. The proxy redirect is only an optimistic convenience.
  const session = await requireAdmin();

  return (
    <div className="min-h-dvh">
      <AdminTopBar />

      {/* Padded top and bottom by the fixed bars' heights. */}
      <div className="flex min-h-dvh flex-col pt-14 pb-12 md:flex-row">
        <aside className={`shrink-0 border-b p-4 md:w-56 md:border-r md:border-b-0 ${ui.panel} ${ui.rule}`}>
          <div className="md:sticky md:top-[calc(3.5rem+1rem)]">
            <AdminNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
      </div>

      <AdminFooter email={session.email} role={session.role} signOut={signOut} />
    </div>
  );
}
