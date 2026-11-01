import { notFound } from "next/navigation";

import { BackLink } from "@/components/admin/back-link";
import { OrderDetail } from "@/components/admin/order-detail";
import { requireAdmin } from "@/lib/auth/dal";
import { detailsOf } from "@/lib/checkout/order";
import { db } from "@/lib/db";

/** One order, opened by its number from the orders list. */
export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  // Checked here as well as in the admin layout, which moving between
  // admin pages does not render again.
  await requireAdmin();

  const { number } = await params;
  const order = await db.order.findUnique({
    where: { orderNumber: decodeURIComponent(number) },
    include: {
      items: { orderBy: { id: "asc" } },
      shippingAddress: true,
      discountCode: { select: { code: true } },
      customer: { select: { passwordHash: true } },
    },
  });
  if (!order) notFound();

  const address = order.shippingAddress;

  return (
    <>
      <BackLink href="/admin/orders">Back to all orders</BackLink>
      <div className="mt-4">
        <OrderDetail
          order={{
            orderNumber: order.orderNumber,
            status: order.status,
            placedAt: order.createdAt,
            email: order.email,
            phone: address?.phone ?? null,
            guest: !order.customer?.passwordHash,
            gift: order.gift,
            giftNote: order.giftNote,
            hidePrices: order.hidePrices,
            shippingMethod: order.shippingMethod,
            parcel: order.parcelSize && order.parcelGrams !== null ? { size: order.parcelSize, grams: order.parcelGrams, mm: order.parcelMm } : null,
            address: address
              ? { name: address.name, line1: address.line1, line2: address.line2, city: address.city, county: address.county, postcode: address.postcode }
              : null,
            items: order.items.map((item) => ({
              id: item.id,
              name: item.productName,
              variantName: item.variantName,
              sku: item.sku,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
              unitPence: item.unitPricePence,
              totalPence: item.totalPence,
              details: detailsOf(item.details),
            })),
            subtotalPence: order.subtotalPence,
            discountPence: order.discountPence,
            codeName: order.discountCode?.code ?? null,
            shippingPence: order.shippingPence,
            totalPence: order.totalPence,
            taxPence: order.taxPence,
          }}
        />
      </div>
    </>
  );
}
