import { normaliseEmail } from "@/lib/auth/authenticate";
import type { AdminRole } from "@/lib/auth/session";

const ROLES: readonly AdminRole[] = ["OWNER", "STAFF"];

// Deliberately loose: something@something.something. The point is to catch a
// name typed into the wrong box, not to validate deliverability.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 12;

/** bcrypt ignores everything past 72 bytes, so a longer password is silently weakened. */
export const MAX_PASSWORD_BYTES = 72;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Passwords are never trimmed: a leading or trailing space is a legitimate character. */
function raw(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export interface NewAdminInput {
  email: string;
  name: string;
  role: AdminRole;
}

export type NewAdminErrors = Partial<Record<keyof NewAdminInput, string>>;

export type NewAdminValidation =
  | { ok: true; data: NewAdminInput }
  | { ok: false; errors: NewAdminErrors };

export function validateNewAdminInput(form: FormData): NewAdminValidation {
  const errors: NewAdminErrors = {};

  const email = normaliseEmail(text(form, "email"));
  if (!LOOKS_LIKE_EMAIL.test(email)) {
    errors.email = "Enter the email address they will sign in with.";
  }

  const name = text(form, "name");
  if (name.length === 0) {
    errors.name = "Give the account a name.";
  }

  const roleRaw = text(form, "role") || "STAFF";
  if (!ROLES.includes(roleRaw as AdminRole)) {
    errors.role = "Choose owner or staff.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { email, name, role: roleRaw as AdminRole } };
}

export interface PasswordChangeInput {
  currentPassword: string;
  newPassword: string;
}

export type PasswordChangeField = "currentPassword" | "newPassword" | "confirmPassword";

export type PasswordChangeErrors = Partial<Record<PasswordChangeField, string>>;

export type PasswordChangeValidation =
  | { ok: true; data: PasswordChangeInput }
  | { ok: false; errors: PasswordChangeErrors };

export function validatePasswordChange(form: FormData): PasswordChangeValidation {
  const errors: PasswordChangeErrors = {};

  const currentPassword = raw(form, "currentPassword");
  const newPassword = raw(form, "newPassword");
  const confirmPassword = raw(form, "confirmPassword");

  if (currentPassword.length === 0) {
    errors.currentPassword = "Enter your current password.";
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Use at least ${MIN_PASSWORD_LENGTH} characters. A few words you will remember work well.`;
  } else if (Buffer.byteLength(newPassword, "utf8") > MAX_PASSWORD_BYTES) {
    errors.newPassword = `That is longer than the ${MAX_PASSWORD_BYTES} bytes a password can be.`;
  } else if (newPassword === currentPassword) {
    errors.newPassword = "The new password has to be different from the current one.";
  }

  if (confirmPassword !== newPassword) {
    errors.confirmPassword = "The two new passwords do not match.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { currentPassword, newPassword } };
}
