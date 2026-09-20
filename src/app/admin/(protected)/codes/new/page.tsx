import { DiscountCodeForm } from "@/components/admin/discount-code-form";
import { createDiscountCode } from "@/app/admin/(protected)/codes/actions";

export default function NewCodePage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">New promo code</h1>
      <div className="mt-6">
        <DiscountCodeForm action={createDiscountCode} submitLabel="Create code" />
      </div>
    </>
  );
}
