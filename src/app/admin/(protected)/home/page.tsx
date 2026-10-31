import { saveHome, uploadHomePhoto } from "@/app/admin/(protected)/home/actions";
import { HomeForm, type PhotoOption } from "@/components/admin/home-form";
import { ui } from "@/lib/brand/ui";
import { categoryPaths, pathsOf } from "@/lib/categories/path";
import { db } from "@/lib/db";
import { loadHome } from "@/lib/home/load";
import { photoChoice } from "@/lib/home/tiles";
import { tileProducts } from "@/lib/storefront/queries";
import { leadPhotos } from "@/lib/storefront/tiles";

export default async function AdminHomePage() {
  const [{ page, tiles }, categories, images, products] = await Promise.all([
    loadHome(),
    db.category.findMany({ select: { id: true, slug: true, name: true, parentId: true } }),
    // Every photo of every piece: a tile can use any of them, not only the
    // first, and a piece's second or third photo is often the one in a scene.
    db.productImage.findMany({
      orderBy: [{ product: { name: "asc" } }, { position: "asc" }],
      select: {
        id: true,
        url: true,
        position: true,
        product: { select: { name: true, status: true, categories: { select: { categoryId: true } } } },
      },
    }),
    tileProducts(),
  ]);

  const paths = categoryPaths(categories);

  const photos: PhotoOption[] = images.map((image) => {
    const where = pathsOf(
      image.product.categories.map((link) => link.categoryId),
      paths,
    );
    return {
      choice: `image:${image.id}`,
      title: image.product.name,
      details: [`Photo ${image.position + 1}`, ...(image.product.status === "ACTIVE" ? [] : ["Not on the shop"])],
      url: image.url,
      // The file name too: it often says what the piece is when nothing else does.
      searchText: [image.product.name, ...where, image.url.split("/").pop() ?? ""].join(" "),
    };
  });

  // Photos uploaded for tiles, which belong to no piece.
  for (const tile of tiles) {
    if (tile.photo?.kind === "upload" && tile.photoUrl) {
      photos.unshift({ choice: photoChoice(tile.photo), title: "Uploaded photo", details: [], url: tile.photoUrl, searchText: "uploaded" });
    }
  }

  const automatic = Object.fromEntries(
    [...leadPhotos(categories, categories.map((category) => category.id), products)].map(([id, image]) => [id, image.url]),
  );

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Home page</h1>
      <p className={`mt-2 max-w-prose text-sm ${ui.mutedOnPage}`}>
        Everything on the shop&apos;s front page, top to bottom. The pieces themselves are the ones marked featured on the
        product; mark none and it shows the newest.
      </p>

      <HomeForm
        content={{ ...page, tiles }}
        categories={[...paths].map(([id, path]) => ({ id, path })).sort((a, b) => a.path.localeCompare(b.path))}
        photos={photos}
        automatic={automatic}
        action={saveHome}
        upload={uploadHomePhoto}
      />
    </>
  );
}
