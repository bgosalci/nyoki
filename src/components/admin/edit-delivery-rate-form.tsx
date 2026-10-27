"use client";

import { useRef, useState } from "react";

import { deleteDeliveryRate, updateDeliveryRate } from "@/app/admin/(protected)/settings/delivery/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { DeliveryRateForm } from "@/components/admin/delivery-rate-form";
import { ui } from "@/lib/brand/ui";
import type { DeliveryRateInput } from "@/lib/delivery/validate";

/** Binds the option's id to its actions; see EditProductForm for why this is a client component. */
export function EditDeliveryRateForm({ id, rate }: { id: string; rate: DeliveryRateInput }) {
  const [confirming, setConfirming] = useState(false);
  const deleteForm = useRef<HTMLFormElement>(null);

  return (
    <div className="flex flex-col gap-8">
      <DeliveryRateForm action={updateDeliveryRate.bind(null, id)} rate={rate} submitLabel="Save changes" />

      <form ref={deleteForm} action={deleteDeliveryRate.bind(null, id)} className={`border-t pt-6 ${ui.ruleOnPage}`}>
        <button type="button" onClick={() => setConfirming(true)} className="text-sm text-red-700 underline underline-offset-4 dark:text-red-300">
          Delete this option
        </button>
      </form>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${rate.name}?`}
        description="Checkout will stop offering it. Orders already sent with it keep its name and what it cost."
        confirmLabel="Delete option"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          deleteForm.current?.requestSubmit();
        }}
      />
    </div>
  );
}
