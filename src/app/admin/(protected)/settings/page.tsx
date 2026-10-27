import Link from "next/link";

import { ui } from "@/lib/brand/ui";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { NewAdminForm } from "@/components/admin/new-admin-form";
import { TeamList } from "@/components/admin/team-list";
import { changePassword, createAdmin } from "@/app/admin/(protected)/settings/actions";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default async function SettingsPage() {
  const session = await requireAdmin();

  const offered = await db.shippingRate.count({ where: { active: true } });

  const members =
    session.role === "OWNER"
      ? await db.adminUser.findMany({
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
        })
      : [];

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-8 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold">Your account</h2>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            Signed in as {session.email} · {session.role === "OWNER" ? "Owner" : "Staff"}
          </p>
        </div>
        <ChangePasswordForm action={changePassword} />
      </section>

      <section className={`mt-12 flex flex-col gap-2 border-t pt-8 ${ui.ruleOnPage}`}>
        <h2 className="text-base font-semibold">Delivery</h2>
        <p className={`text-sm ${ui.mutedOnPage}`}>
          {offered === 0
            ? "No delivery options are offered yet, so checkout has nothing to offer."
            : `${offered} ${offered === 1 ? "option is" : "options are"} offered at checkout.`}
        </p>
        <Link href="/admin/settings/delivery" className={`self-start text-sm ${ui.link}`}>
          Delivery options
        </Link>
      </section>

      {session.role === "OWNER" ? (
        <>
          <section className={`mt-12 flex flex-col gap-4 border-t pt-8 ${ui.ruleOnPage}`}>
            <h2 className="text-base font-semibold">Team</h2>
            <div>
              <TeamList
                currentUserId={session.userId}
                members={members.map((m) => ({
                  ...m,
                  lastLoginAt: m.lastLoginAt ? when.format(m.lastLoginAt) : null,
                }))}
              />
            </div>
          </section>

          <section className={`mt-12 flex flex-col gap-4 border-t pt-8 ${ui.ruleOnPage}`}>
            <h2 className="text-base font-semibold">Add someone</h2>
            <NewAdminForm action={createAdmin} />
          </section>
        </>
      ) : null}
    </>
  );
}
