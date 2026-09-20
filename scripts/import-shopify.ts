/**
 * Import a Shopify product export into the CMS.
 *
 *   pnpm import:shopify "<path to products_export.csv>" [--dry-run] [--skip-images] [--limit N]
 *
 * Products already present (matched by slug = Shopify handle) are left alone,
 * so re-running never clobbers edits made in the CMS since. Images are
 * downloaded from Shopify's CDN, checked with the same byte-sniffing the
 * upload screen uses, and stored through the same ImageStorage - local disk in
 * development, Vercel Blob when BLOB_READ_WRITE_TOKEN is set.
 */

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { db } from "@/lib/db";
import { validateImageUpload } from "@/lib/images/validate";
import { parseShopifyExport, type ImportedProduct } from "@/lib/import/shopify";
import { slugify } from "@/lib/slug";
import { createImageStorage } from "@/lib/storage";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const csvPath = args.find((a) => !a.startsWith("--") && a !== option("--limit"));

if (!csvPath) {
  console.error('Usage: pnpm import:shopify "<csv path>" [--dry-run] [--skip-images] [--limit N]');
  process.exit(1);
}

const dryRun = flag("--dry-run");
const skipImages = flag("--skip-images");
const limit = option("--limit") ? Number.parseInt(option("--limit")!, 10) : Infinity;

async function ensureCategory(name: string, parentId: string | null): Promise<string> {
  const slug = slugify(name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) return existing.id;
  const created = await db.category.create({ data: { name, slug, parentId } });
  console.log(`  + category ${parentId ? "  └ " : ""}${name}`);
  return created.id;
}

async function fetchImage(url: string): Promise<{ bytes: Uint8Array; name: string } | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { bytes: new Uint8Array(await res.arrayBuffer()), name: new URL(url).pathname.split("/").pop() ?? "image" };
    } catch (error) {
      if (attempt === 2) { console.warn(`    ! image failed: ${url} (${(error as Error).message})`); return null; }
    }
  }
  return null;
}

async function importProduct(p: ImportedProduct, categoryIds: Map<string, string>): Promise<"created" | "present"> {
  if (await db.product.findUnique({ where: { slug: p.slug }, select: { id: true } })) return "present";

  const categoryId = p.category ? categoryIds.get(p.category.name) : undefined;

  const product = await db.product.create({
    data: {
      slug: p.slug, name: p.name, description: p.description, status: p.status,
      pricePence: p.pricePence, compareAtPence: p.compareAtPence, sku: p.sku, stock: p.stock, weightGrams: p.weightGrams,
      variants: { create: p.variants.map((v) => ({ name: v.name, options: v.options, sku: v.sku, pricePence: v.pricePence, stock: v.stock, position: v.position })) },
      ...(categoryId ? { categories: { create: [{ categoryId }] } } : {}),
    },
  });

  if (!skipImages && p.images.length > 0) {
    const storage = createImageStorage();
    let position = 0;
    for (const image of p.images) {
      const file = await fetchImage(image.url);
      if (!file) continue;
      const check = validateImageUpload({ name: file.name, type: "", size: file.bytes.byteLength, head: file.bytes.slice(0, 16), existingCount: position });
      if (!check.ok) { console.warn(`    ! skipped ${file.name}: ${check.error}`); continue; }
      const { url } = await storage.put(`products/${product.id}/${randomUUID()}.${check.extension}`, file.bytes, check.contentType);
      await db.productImage.create({ data: { productId: product.id, url, alt: image.alt, position } });
      position++;
    }
  }

  return "created";
}

async function main() {
  const report = parseShopifyExport(readFileSync(csvPath!, "utf8"));
  const products = report.products.slice(0, limit);

  const categories = new Map<string, string | null>();
  for (const p of products) if (p.category) categories.set(p.category.name, p.category.parent);
  const parents = new Set([...categories.values()].filter((v): v is string => v !== null));

  console.log(`parsed ${report.products.length} products (${products.length} selected), ${report.skipped.length} skipped, ${products.reduce((n, p) => n + p.images.length, 0)} images, ${parents.size} top-level + ${categories.size} categories`);
  for (const s of report.skipped) console.log(`  skipped ${s.handle}: ${s.reason}`);

  if (dryRun) {
    console.log("\n--dry-run: nothing written. First three:");
    for (const p of products.slice(0, 3)) console.log(`  ${p.name} £${(p.pricePence / 100).toFixed(2)} [${p.status}] ${p.variants.length} variants, ${p.images.length} images, ${p.category?.parent ?? "-"} > ${p.category?.name ?? "-"}`);
    return;
  }

  const categoryIds = new Map<string, string>();
  for (const parent of parents) categoryIds.set(parent, await ensureCategory(parent, null));
  for (const [name, parent] of categories) if (!categoryIds.has(name)) categoryIds.set(name, await ensureCategory(name, parent ? categoryIds.get(parent)! : null));

  let created = 0, present = 0;
  for (const [i, p] of products.entries()) {
    const result = await importProduct(p, categoryIds);
    if (result === "created") created++; else present++;
    if ((i + 1) % 25 === 0 || i === products.length - 1) console.log(`  ${i + 1}/${products.length} (${created} created, ${present} already present)`);
  }

  console.log(`\ndone: ${created} created, ${present} already present, ${report.skipped.length} skipped`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());
