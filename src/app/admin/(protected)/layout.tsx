import type { Metadata } from "next";

import { AdminFooter } from "@/components/admin/admin-footer";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { THEME_BOOTSTRAP } from "@/lib/admin/theme";
import { requireAdmin } from "@/lib/auth/dal";
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
      {/* Ahead of the markup below, so a chosen theme is already on the page
          when it first paints rather than snapping into place afterwards. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />

      <AdminTopBar />

      {/* Padded top and bottom by the fixed bars' heights. */}
      <div className="flex min-h-dvh flex-col pt-14 pb-12 md:flex-row">
        <AdminSidebar />

        <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
      </div>

      <AdminFooter email={session.email} role={session.role} signOut={signOut} />
    </div>
  );
}
