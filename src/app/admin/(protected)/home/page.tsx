import { saveHome } from "@/app/admin/(protected)/home/actions";
import { HomeForm } from "@/components/admin/home-form";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { HOME_DEFAULTS } from "@/lib/home/content";

export default async function AdminHomePage() {
  const [row, products] = await Promise.all([
    db.homePage.findUnique({ where: { id: "home" } }),
    // Only pieces that could actually lead the page: on the shop, with a photo.
    db.product.findMany({
      where: { status: "ACTIVE", images: { some: {} } },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      },
    }),
  ]);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Home page</h1>
      <p className={`mt-2 max-w-prose text-sm ${ui.mutedOnPage}`}>
        What the shop says before anyone has clicked anything. The row of pieces shows whatever is marked featured on
        the product itself; mark none and it shows the newest.
      </p>

      <HomeForm
        content={row ?? HOME_DEFAULTS}
        products={products.map(({ id, name, images }) => ({ id, name, image: images[0] ?? null }))}
        action={saveHome}
      />
    </>
  );
}
