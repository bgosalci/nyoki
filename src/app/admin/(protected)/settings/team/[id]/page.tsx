import { BackLink } from "@/components/admin/back-link";
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
      <div className="flex flex-col gap-2">
        <BackLink href="/admin/settings">Back to settings</BackLink>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{admin.name}</h1>
          <p className={`text-sm ${ui.mutedOnPage}`}>{admin.email}</p>
        </div>
      </div>
      <div className="mt-6">
        <EditAdminPanel id={id} admin={{ name: admin.name, role: admin.role }} />
      </div>
    </>
  );
}
