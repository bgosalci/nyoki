"use client";

import { ui } from "@/lib/brand/ui";
import Link from "next/link";

import { RemoveAdminButton } from "@/components/admin/remove-admin-button";
import { removeAdmin } from "@/app/admin/(protected)/settings/actions";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  lastLoginAt: string | null;
}

/** Binds each row's id to the remove action; a client component for the same reason as EditProductForm. */
export function TeamList({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  return (
    <table className="w-full min-w-md border-collapse text-sm">
      <thead>
        <tr className={`border-b text-left ${ui.tableHead}`}>
          <th className="py-2.5 pr-4 font-medium">Name</th>
          <th className="py-2.5 pr-4 font-medium">Email</th>
          <th className="py-2.5 pr-4 font-medium">Role</th>
          <th className="py-2.5 pr-4 font-medium">Last signed in</th>
          <th className="py-2.5 font-medium"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => (
          <tr key={member.id} className={`border-b ${ui.tableRow}`}>
            <td className="py-3 pr-4 font-medium">
              {member.name}
              {member.id === currentUserId ? (
                <span className={`ml-2 text-xs ${ui.mutedOnPage}`}>you</span>
              ) : null}
            </td>
            <td className="py-3 pr-4">{member.email}</td>
            <td className="py-3 pr-4">{member.role === "OWNER" ? "Owner" : "Staff"}</td>
            <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>{member.lastLoginAt ?? "Never"}</td>
            <td className="py-3 text-right">
              <div className="flex items-center justify-end gap-4">
                <Link href={`/admin/settings/team/${member.id}`} className={`text-sm ${ui.link}`}>
                  Edit
                </Link>
                {member.id === currentUserId ? null : (
                  <RemoveAdminButton action={removeAdmin.bind(null, member.id)} name={member.name} />
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
