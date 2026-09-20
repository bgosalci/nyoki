import type { AdminRole } from "@/lib/auth/session";

export interface AdminSummary {
  id: string;
  role: AdminRole;
}

/**
 * Why `actorId` may not remove `targetId`, or null if they may.
 *
 * Checked on the server before every removal. The rules protect against the
 * two ways a shop locks itself out: removing yourself mid-session, and
 * removing the only owner, after which nobody could manage accounts at all.
 */
export function removalBlockedBecause(
  admins: readonly AdminSummary[],
  { actorId, targetId }: { actorId: string; targetId: string },
): string | null {
  const target = admins.find((admin) => admin.id === targetId);
  if (!target) return "That account no longer exists.";

  const actor = admins.find((admin) => admin.id === actorId);
  if (actor?.role !== "OWNER") return "Only an owner can remove accounts.";

  if (targetId === actorId) return "You cannot remove your own account.";

  const owners = admins.filter((admin) => admin.role === "OWNER").length;
  if (target.role === "OWNER" && owners <= 1) return "The last owner cannot be removed.";

  return null;
}

/**
 * Why `actorId` may not set `targetId`'s role to `newRole`, or null if they may.
 * The one hard rule is that the shop can never end up with no owner.
 */
export function roleChangeBlockedBecause(
  admins: readonly AdminSummary[],
  { actorId, targetId, newRole }: { actorId: string; targetId: string; newRole: AdminRole },
): string | null {
  const target = admins.find((admin) => admin.id === targetId);
  if (!target) return "That account no longer exists.";

  const actor = admins.find((admin) => admin.id === actorId);
  if (actor?.role !== "OWNER") return "Only an owner can change roles.";

  if (target.role === newRole) return null;

  const owners = admins.filter((admin) => admin.role === "OWNER").length;
  if (target.role === "OWNER" && owners <= 1) return "The last owner cannot be made staff.";

  return null;
}
