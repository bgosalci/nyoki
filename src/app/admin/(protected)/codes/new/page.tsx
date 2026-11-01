import { DiscountCodeForm } from "@/components/admin/discount-code-form";
import { createDiscountCode } from "@/app/admin/(protected)/codes/actions";
import { requireAdmin } from "@/lib/auth/dal";

export default async function NewCodePage() {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">New promo code</h1>
      <div className="mt-6">
        <DiscountCodeForm action={createDiscountCode} submitLabel="Create code" />
      </div>
    </>
  );
}
