/**
 * Re-parent every category according to the current grouping rule.
 *
 *   pnpm categories:regroup [--dry-run]
 *
 * The import assigns a parent only when it creates a category, so a fix to
 * categoryFor() does not reach categories that already exist. This applies the
 * rule to all of them. Categories whose name is itself a group (Cards,
 * Accessories, Clothes) stay at the top level.
 */

import { db } from "@/lib/db";
import { categoryFor } from "@/lib/import/shopify";
import { slugify } from "@/lib/slug";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const categories = await db.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  let moved = 0;
  for (const category of categories) {
    // An unrecognised type keeps whatever parent it has, and a group name
    // (Cards, Accessories, Clothes) is itself the top level.
    const wanted = categoryFor(category.name)?.parent ?? null;
    if (wanted === null || slugify(wanted) === category.slug) continue;

    let parent = bySlug.get(slugify(wanted));
    if (!parent) {
      if (dryRun) { console.log(`  would create group ${wanted}`); continue; }
      const created = await db.category.create({ data: { name: wanted, slug: slugify(wanted) } });
      parent = { ...created, parentId: null };
      bySlug.set(parent.slug, parent);
      console.log(`  + group ${wanted}`);
    }

    if (category.parentId === parent.id) continue;

    const from = categories.find((c) => c.id === category.parentId)?.name ?? "top level";
    console.log(`  ${dryRun ? "would move" : "moved"} ${category.name}: ${from} -> ${wanted}`);
    if (!dryRun) await db.category.update({ where: { id: category.id }, data: { parentId: parent.id } });
    moved++;
  }

  console.log(`${dryRun ? "would move" : "moved"} ${moved} of ${categories.length} categories`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => db.$disconnect());
