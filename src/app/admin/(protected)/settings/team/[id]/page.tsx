import Link from "next/link";
import { notFound } from "next/navigation";

import { EditAdminPanel } from "@/components/admin/edit-admin-panel";
import { requireOwner } from "@/lib/auth/dal";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const admin = await db.adminUser.findUnique({ where: { id }, select: { name: true, email: true, role: true } });
  if (!admin) notFound();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{admin.name}</h1>
          <p className={`text-sm ${ui.mutedOnPage}`}>{admin.email}</p>
        </div>
        <Link href="/admin/settings" className={`text-sm ${ui.link}`}>
          Settings
        </Link>
      </div>
      <div className="mt-6">
        <EditAdminPanel id={id} admin={{ name: admin.name, role: admin.role }} />
      </div>
    </>
  );
}
