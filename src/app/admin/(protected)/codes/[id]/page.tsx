import { notFound } from "next/navigation";

import { BackLink } from "@/components/admin/back-link";
import { EditDiscountCodeForm } from "@/components/admin/edit-discount-code-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import type { DiscountCodeInput } from "@/lib/discounts/validate";

export default async function EditCodePage({ params }: { params: Promise<{ id: string }> }) {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const { id } = await params;
  const code = await db.discountCode.findUnique({ where: { id } });
  if (!code) notFound();

  const initial: DiscountCodeInput = {
    code: code.code,
    type: code.type,
    value: code.value,
    minSpendPence: code.minSpendPence,
    usageLimit: code.usageLimit,
    startsAt: code.startsAt,
    endsAt: code.endsAt,
    active: code.active,
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/codes">Back to all codes</BackLink>
        <h1 className="font-mono text-xl font-semibold tracking-wider">{code.code}</h1>
      </div>
      <div className="mt-6">
        <EditDiscountCodeForm id={code.id} code={initial} />
      </div>
    </>
  );
}
