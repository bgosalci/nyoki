import { MAX_PASSWORD_BYTES } from "@/lib/admin/validate";
import { normaliseEmail } from "@/lib/auth/authenticate";

/**
 * What a shopper types to register or sign in.
 *
 * The password floor is lower than the CMS's twelve. A shopper account holds
 * an order history and a list of saved pieces; a staff account holds the shop
 * itself. Eight is the recognised floor, and no composition rules on top of
 * it - demanding a digit and a capital reliably produces Password1.
 */

// Deliberately loose: something@something.something. The point is to catch a
// name typed into the wrong box, not to validate deliverability.
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_CUSTOMER_PASSWORD_LENGTH = 8;

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Passwords are never trimmed: a leading or trailing space is a character like any other. */
function raw(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
}

export type RegistrationField = keyof RegistrationInput;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

export type RegistrationValidation =
  | { ok: true; data: RegistrationInput }
  | { ok: false; errors: RegistrationErrors };

export function validateRegistration(form: FormData): RegistrationValidation {
  const errors: RegistrationErrors = {};

  const name = text(form, "name");
  if (name.length === 0) errors.name = "Tell us your name, so we know how to address you.";

  const email = normaliseEmail(text(form, "email"));
  if (!LOOKS_LIKE_EMAIL.test(email)) errors.email = "Enter an email address we can reach you at.";

  const password = raw(form, "password");
  if (password.length < MIN_CUSTOMER_PASSWORD_LENGTH) {
    errors.password = `Choose a password of at least ${MIN_CUSTOMER_PASSWORD_LENGTH} characters.`;
  } else if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    errors.password = `That is longer than ${MAX_PASSWORD_BYTES} characters, and the end of it would be ignored.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { name, email, password } };
}

export interface SignInInput {
  email: string;
  password: string;
}

export type SignInValidation =
  | { ok: true; data: SignInInput }
  | { ok: false; errors: Record<string, never> };

/**
 * Only checks that both boxes were filled in.
 *
 * Deliberately not the registration rules: somebody who registered when the
 * floor was lower must still be able to sign in, and telling them their
 * password is too short to be valid would say more about the account than it
 * should.
 */
export function validateSignIn(form: FormData): SignInValidation {
  const email = normaliseEmail(text(form, "email"));
  const password = raw(form, "password");

  if (email.length === 0 || password.length === 0) return { ok: false, errors: {} };

  return { ok: true, data: { email, password } };
}

export interface CustomerDetailsInput {
  name: string;
  email: string;
}

export type CustomerDetailsErrors = Partial<Record<keyof CustomerDetailsInput, string>>;

export type CustomerDetailsValidation =
  | { ok: true; data: CustomerDetailsInput }
  | { ok: false; errors: CustomerDetailsErrors };

export function validateCustomerDetails(form: FormData): CustomerDetailsValidation {
  const errors: CustomerDetailsErrors = {};

  const name = text(form, "name");
  if (name.length === 0) errors.name = "Tell us your name, so we know how to address you.";

  const email = normaliseEmail(text(form, "email"));
  if (!LOOKS_LIKE_EMAIL.test(email)) errors.email = "Enter an email address we can reach you at.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { name, email } };
}

export interface CustomerPasswordChange {
  currentPassword: string;
  newPassword: string;
}

export type CustomerPasswordField = "currentPassword" | "newPassword" | "confirmPassword";
export type CustomerPasswordErrors = Partial<Record<CustomerPasswordField, string>>;

export type CustomerPasswordValidation =
  | { ok: true; data: CustomerPasswordChange }
  | { ok: false; errors: CustomerPasswordErrors };

/**
 * Whether a password change is worth sending to the server.
 *
 * The current password is asked for so that a screen left unlocked cannot be
 * used to lock its owner out. Whether it is the RIGHT one is the server's
 * question, not this one's.
 */
export function validateCustomerPasswordChange(form: FormData): CustomerPasswordValidation {
  const errors: CustomerPasswordErrors = {};

  const currentPassword = raw(form, "currentPassword");
  if (currentPassword.length === 0) errors.currentPassword = "Enter your current password.";

  const newPassword = raw(form, "newPassword");
  const confirmPassword = raw(form, "confirmPassword");

  if (newPassword.length < MIN_CUSTOMER_PASSWORD_LENGTH) {
    errors.newPassword = `Choose a password of at least ${MIN_CUSTOMER_PASSWORD_LENGTH} characters.`;
  } else if (Buffer.byteLength(newPassword, "utf8") > MAX_PASSWORD_BYTES) {
    errors.newPassword = `That is longer than ${MAX_PASSWORD_BYTES} characters, and the end of it would be ignored.`;
  } else if (newPassword === currentPassword) {
    errors.newPassword = "That is the password you already have.";
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = "The two new passwords do not match.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return { ok: true, data: { currentPassword, newPassword } };
}
