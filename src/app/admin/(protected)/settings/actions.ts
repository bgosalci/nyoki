"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import type { ChangePasswordState } from "@/components/admin/change-password-form";
import type { EditAdminState } from "@/components/admin/edit-admin-form";
import type { NewAdminState } from "@/components/admin/new-admin-form";
import type { RemoveAdminState } from "@/components/admin/remove-admin-button";
import type { ResetPasswordState } from "@/components/admin/reset-password-button";
import { removalBlockedBecause, roleChangeBlockedBecause } from "@/lib/admin/removal";
import { validateAdminEdit, validateNewAdminInput, validatePasswordChange } from "@/lib/admin/validate";
import { requireAdmin, requireOwner } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { isUniqueViolationOn } from "@/lib/db-errors";

export async function changePassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await requireAdmin();

  const result = validatePasswordChange(formData);
  if (!result.ok) return { errors: result.errors, done: false };

  const admin = await db.adminUser.findUnique({ where: { id: session.userId } });
  const matches = admin ? await verifyPassword(result.data.currentPassword, admin.passwordHash) : false;

  if (!admin || !matches) {
    return { errors: { currentPassword: "That is not your current password." }, done: false };
  }

  await db.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(result.data.newPassword) },
  });

  return { errors: {}, done: true };
}

export async function createAdmin(_state: NewAdminState, formData: FormData): Promise<NewAdminState> {
  await requireOwner();

  const result = validateNewAdminInput(formData);
  if (!result.ok) return { errors: result.errors, created: null };

  // 18 random bytes as base64url is ~24 characters: comfortably strong, well
  // inside bcrypt's 72-byte limit, and shown to the owner exactly once.
  const password = randomBytes(18).toString("base64url");

  try {
    await db.adminUser.create({
      data: { ...result.data, passwordHash: await hashPassword(password) },
    });
  } catch (error) {
    if (isUniqueViolationOn(error, { table: "admin_users", column: "email" })) {
      return { errors: { email: "Another account already uses that email." }, created: null };
    }
    throw error;
  }

  revalidatePath("/admin/settings");
  return { errors: {}, created: { email: result.data.email, password } };
}

export async function removeAdmin(
  targetId: string,
  _state: RemoveAdminState,
  _formData: FormData,
): Promise<RemoveAdminState> {
  const session = await requireOwner();

  const admins = await db.adminUser.findMany({ select: { id: true, role: true } });
  const blocked = removalBlockedBecause(admins, { actorId: session.userId, targetId });
  if (blocked) return { error: blocked };

  await db.adminUser.delete({ where: { id: targetId } });

  revalidatePath("/admin/settings");
  return { error: null };
}

export async function updateAdmin(
  targetId: string,
  _state: EditAdminState,
  formData: FormData,
): Promise<EditAdminState> {
  const session = await requireOwner();

  const result = validateAdminEdit(formData);
  if (!result.ok) return { errors: result.errors, saved: false };

  const admins = await db.adminUser.findMany({ select: { id: true, role: true } });
  const blocked = roleChangeBlockedBecause(admins, { actorId: session.userId, targetId, newRole: result.data.role });
  if (blocked) return { errors: { role: blocked }, saved: false };

  await db.adminUser.update({ where: { id: targetId }, data: result.data });

  revalidatePath("/admin/settings");
  revalidatePath(`/admin/settings/team/${targetId}`);
  return { errors: {}, saved: true };
}

export async function resetAdminPassword(
  targetId: string,
  _state: ResetPasswordState,
  _formData: FormData,
): Promise<ResetPasswordState> {
  await requireOwner();

  const target = await db.adminUser.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return { password: null, error: "That account no longer exists." };

  const password = randomBytes(18).toString("base64url");
  await db.adminUser.update({ where: { id: targetId }, data: { passwordHash: await hashPassword(password) } });

  return { password, error: null };
}
