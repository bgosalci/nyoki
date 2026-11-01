import { notFound } from "next/navigation";

import { BackLink } from "@/components/admin/back-link";
import { EditDeliveryRateForm } from "@/components/admin/edit-delivery-rate-form";
import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export default async function EditDeliveryRatePage({ params }: { params: Promise<{ id: string }> }) {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const { id } = await params;
  const rate = await db.shippingRate.findUnique({
    where: { id },
    include: { bands: { select: { size: true, upToGrams: true, pricePence: true }, orderBy: [{ size: "asc" }, { upToGrams: "asc" }] } },
  });
  if (!rate) notFound();

  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/settings/delivery">Back to delivery</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">{rate.name}</h1>
      </div>
      <div className="mt-6">
        <EditDeliveryRateForm
          id={rate.id}
          rate={{
            name: rate.name,
            pricePence: rate.pricePence,
            byWeight: rate.byWeight,
            bands: rate.bands,
            freeOverPence: rate.freeOverPence,
            minDays: rate.minDays,
            maxDays: rate.maxDays,
            active: rate.active,
          }}
        />
      </div>
    </>
  );
}
