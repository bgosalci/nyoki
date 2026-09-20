"use client";

import { EditAdminForm } from "@/components/admin/edit-admin-form";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { resetAdminPassword, updateAdmin } from "@/app/admin/(protected)/settings/actions";
import { ui } from "@/lib/brand/ui";
import type { AdminRole } from "@/lib/auth/session";

/** Binds the account id to both actions; a client component for the same reason as EditProductForm. */
export function EditAdminPanel({ id, admin }: { id: string; admin: { name: string; role: AdminRole } }) {
  return (
    <div className="flex flex-col gap-10">
      <EditAdminForm action={updateAdmin.bind(null, id)} admin={admin} />
      <section className={`flex flex-col gap-3 border-t pt-8 ${ui.ruleOnPage}`}>
        <h2 className="text-base font-semibold">Password</h2>
        <p className={`text-sm ${ui.mutedOnPage}`}>
          If {admin.name} has forgotten their password, reset it here and pass the new one on.
        </p>
        <ResetPasswordButton action={resetAdminPassword.bind(null, id)} name={admin.name} />
      </section>
    </div>
  );
}
