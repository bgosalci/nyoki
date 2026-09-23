/**
 * Bring Njomza's 2023 price lists into the CMS.
 *
 *   pnpm prices:import "<directory written by scripts/price-lists/extract.py>" [--dry-run]
 *
 * Every costed row becomes a PriceListEntry, with its photo stored through
 * the same ImageStorage as uploads. A row whose photo is certainly one of the
 * catalogue's is attached to that product: its cost lines are copied across
 * and the product takes the row's VAT rate. The rest wait on the pricing page
 * to be chosen by eye.
 *
 * Two things it will not do. It never changes a price - the product's
 * current price stands and the sheet's is kept only for reference. And it
 * never writes over costs a product already has, so re-running is safe:
 * rows already imported are recognised by where they came from and skipped.
 */

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { db } from "@/lib/db";
import { isEmptyTemplate, toEntry, type EntryLine, type SheetRow } from "@/lib/costing/import";
import { confidentProductFor, type MatchProduct } from "@/lib/costing/matching";
import { validateImageUpload } from "@/lib/images/validate";
import { createImageStorage } from "@/lib/storage";

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!dir) {
  console.error('Usage: pnpm prices:import "<directory written by extract.py>" [--dry-run]');
  process.exit(1);
}

const { rows, catalogue } = JSON.parse(readFileSync(join(dir, "price-lists.json"), "utf8")) as {
  rows: SheetRow[];
  catalogue: Record<string, string>;
};

async function storePhoto(file: string): Promise<string | null> {
  const bytes = new Uint8Array(readFileSync(join(dir!, "photos", file)));
  const check = validateImageUpload({ name: file, type: "", size: bytes.byteLength, head: bytes.slice(0, 16), existingCount: 0 });
  if (!check.ok) {
    console.warn(`  ! ${file}: ${check.error} - kept without its photo`);
    return null;
  }

  const { url } = await createImageStorage().put(`price-lists/${file.replace(/\.[^.]+$/, "")}.${check.extension}`, bytes, check.contentType);
  return url;
}

interface Candidate {
  /** The entry's id once written; its source until then. */
  key: string;
  id: string | null;
  source: string;
  photoHash: string | null;
  vatRate: number;
  lines: EntryLine[];
}

async function main() {
  console.log(dryRun ? "Dry run: nothing will be written.\n" : "");

  const products = await db.product.findMany({
    select: {
      id: true,
      name: true,
      images: { select: { id: true, url: true, phash: true } },
      _count: { select: { costLines: true } },
      priceListEntry: { select: { id: true } },
    },
  });

  // The catalogue's hashes come from the extract, keyed by file name, so the
  // matching below works the same whether or not anything is being written.
  const hashOf = (url: string) => catalogue[basename(new URL(url, "http://local").pathname)] ?? null;

  let hashed = 0;
  for (const image of products.flatMap((p) => p.images)) {
    const hash = hashOf(image.url);
    if (!hash || hash === image.phash) continue;
    hashed += 1;
    if (!dryRun) await db.productImage.update({ where: { id: image.id }, data: { phash: hash } });
  }
  console.log(`Catalogue photos hashed: ${hashed}`);

  const eligible: MatchProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    photoHashes: p.images.map((i) => hashOf(i.url) ?? i.phash).filter((h): h is string => h !== null),
  }));
  const busy = new Set(products.filter((p) => p._count.costLines > 0 || p.priceListEntry).map((p) => p.id));
  const names = new Map(products.map((p) => [p.id, p.name]));

  // Rows already brought in and still waiting are matched again, so a re-run
  // after the catalogue changes can attach what it could not before.
  const earlier = await db.priceListEntry.findMany();
  const known = new Set(earlier.map((e) => e.source));
  const candidates: Candidate[] = earlier
    .filter((e) => e.productId === null)
    .map((e) => ({ key: e.id, id: e.id, source: e.source, photoHash: e.photoHash, vatRate: e.vatRate, lines: e.lines as unknown as EntryLine[] }));

  const warnings: string[] = [];
  let templates = 0;
  let present = 0;
  let created = 0;

  for (const row of rows) {
    if (isEmptyTemplate(row)) {
      templates += 1;
      continue;
    }

    const { entry, warnings: rowWarnings } = toEntry(row);
    if (known.has(entry.source)) {
      present += 1;
      continue;
    }
    warnings.push(...rowWarnings);
    created += 1;

    const id = dryRun
      ? null
      : (
          await db.priceListEntry.create({
            data: {
              source: entry.source,
              note: entry.note,
              photoUrl: entry.photoFile ? await storePhoto(entry.photoFile) : null,
              photoHash: entry.photoHash,
              photoFilename: entry.photoFilename,
              vatRate: entry.vatRate,
              pricePence: entry.pricePence,
              lines: entry.lines as unknown as object,
            },
            select: { id: true },
          })
        ).id;

    candidates.push({ key: id ?? entry.source, id, source: entry.source, photoHash: entry.photoHash, vatRate: entry.vatRate, lines: entry.lines });
  }

  console.log(`Rows: ${created} brought in, ${present} already here, ${templates} blank templates skipped\n`);

  // A product two rows both surely match is not sure at all: her Valentine
  // photo was pasted into the Christmas sheet as well. Neither is attached.
  const claims = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const productId = confidentProductFor(candidate, eligible);
    if (productId) claims.set(productId, [...(claims.get(productId) ?? []), candidate]);
  }

  let attached = 0;
  const contested: string[] = [];

  for (const [productId, claimants] of claims) {
    if (claimants.length > 1) {
      contested.push(`${names.get(productId)} - claimed by ${claimants.map((c) => c.source).join(" and ")}`);
      continue;
    }
    if (busy.has(productId)) continue;

    const [entry] = claimants;
    attached += 1;
    console.log(`  = ${names.get(productId)}  <-  ${entry.source}`);
    if (dryRun || !entry.id) continue;

    await db.$transaction([
      db.costLine.createMany({ data: entry.lines.map((line, position) => ({ productId, position, ...line })) }),
      db.product.update({ where: { id: productId }, data: { vatRate: entry.vatRate } }),
      db.priceListEntry.update({ where: { id: entry.id }, data: { productId } }),
    ]);
  }

  console.log(`\nAttached with certainty: ${attached}`);
  console.log(`Left to choose by eye:   ${candidates.length - attached}`);

  if (contested.length > 0) {
    console.log("\nMatched twice, so neither was attached:");
    for (const line of contested) console.log(`  ? ${line}`);
  }
  if (warnings.length > 0) {
    console.log("\nWorth knowing:");
    for (const line of warnings) console.log(`  - ${line}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
