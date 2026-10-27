import { createDeliveryRate } from "@/app/admin/(protected)/settings/delivery/actions";
import { BackLink } from "@/components/admin/back-link";
import { DeliveryRateForm } from "@/components/admin/delivery-rate-form";

export default function NewDeliveryRatePage() {
  return (
    <>
      <div className="flex flex-col gap-3">
        <BackLink href="/admin/settings/delivery">Back to delivery</BackLink>
        <h1 className="text-xl font-semibold tracking-tight">New delivery option</h1>
      </div>
      <div className="mt-6">
        <DeliveryRateForm action={createDeliveryRate} submitLabel="Add option" />
      </div>
    </>
  );
}
