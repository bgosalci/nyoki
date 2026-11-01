import type { Metadata } from "next";

import { AdminFooter } from "@/components/admin/admin-footer";
import { AdminMenuProvider, AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { QuestionAlertsProvider } from "@/components/admin/question-alerts";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { signOut } from "@/app/admin/(protected)/actions";

export const metadata: Metadata = {
  title: "Nyoki admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The real guard. The proxy redirect is only an optimistic convenience.
  const session = await requireAdmin();
  // For the sidebar's count, kept live by asking again every few seconds.
  const waiting = await db.question.count({ where: { answeredAt: null } });

  return (
    <QuestionAlertsProvider initialWaiting={waiting} since={new Date().toISOString()}>
      {/* A chosen theme is set before the first paint by the root layout's
          script (THEME_BOOTSTRAP), not one here: React never runs a script
          it renders on a client-side arrival, and warned that it would not. */}
      <div className="min-h-dvh">
        {/* The top bar's Menu opens the sidebar on a phone. */}
        <AdminMenuProvider>
          <AdminTopBar />

          {/* Padded top and bottom by the fixed bars' heights. */}
          <div className="flex min-h-dvh flex-col pt-14 pb-12 md:flex-row">
            <AdminSidebar />

            <main className="min-w-0 flex-1 p-6 md:p-10">{children}</main>
          </div>
        </AdminMenuProvider>

        <AdminFooter email={session.email} role={session.role} signOut={signOut} />
      </div>
    </QuestionAlertsProvider>
  );
}
