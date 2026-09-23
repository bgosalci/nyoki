import type { CostLineInput } from "@/lib/costing/costing";

/**
 * Turning a row of Njomza's Numbers price lists into something to store.
 *
 * This is the one place in the codebase where money arrives as a float: the
 * spreadsheet stores 5p as 0.049999999999999996. It is read through to the
 * penny that was meant, and the single genuine sub-penny cost in her lists is
 * rounded up and reported rather than silently lost.
 */

export interface SheetLine {
  label: string;
  /** Pounds, as the sheet stores it. */
  amount: number;
  quantity: number;
}

/** A row as `scripts/price-lists/extract.py` writes it out. */
export interface SheetRow {
  file: string;
  sheet: string;
  /** Counted from nought, as the file does. */
  row: number;
  /** A fraction: 0.2 for 20%. */
  vat: number;
  /** Pack size. The sheet multiplies the whole cost by it. */
  qty: number;
  lines: SheetLine[];
  /** Pounds, VAT included. */
  price: number;
  note: string;
  photo: string | null;
  phash: string | null;
  filename: string | null;
}

export interface EntryLine extends CostLineInput {
  label: string;
}

export interface ImportedEntry {
  source: string;
  note: string | null;
  vatRate: number;
  pricePence: number;
  lines: EntryLine[];
  photoFile: string | null;
  photoHash: string | null;
  photoFilename: string | null;
}

// Float noise in a stored price is a few units in the fifteenth decimal
// place. A genuine sub-penny amount is thousands of times larger than this.
const NOISE = 1e-6;

function pence(pounds: number): { value: number; subPenny: boolean } {
  const raw = pounds * 100;
  const nearest = Math.round(raw);
  if (Math.abs(raw - nearest) <= NOISE) return { value: nearest, subPenny: false };

  // A real fraction of a penny. Rounded up, because a cost understated is a
  // margin overstated.
  return { value: Math.ceil(raw), subPenny: true };
}

function tidy(label: string): string {
  const collapsed = label.replace(/\s+/g, " ").trim();
  const lowered = collapsed === collapsed.toUpperCase() ? collapsed : collapsed.replace(/(?<=\s)[A-Z](?=[a-z])/g, (c) => c.toLowerCase());
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** A row with neither a photo nor a price is a blank the sheet was copied from. */
export function isEmptyTemplate(row: SheetRow): boolean {
  return row.photo === null && row.price <= 0;
}

export function toEntry(row: SheetRow): { entry: ImportedEntry; warnings: string[] } {
  const source = `${titleCase(row.file)} / ${row.sheet} / row ${row.row + 1}`;
  const warnings: string[] = [];

  const packs = Math.max(1, Math.round(row.qty));
  if (packs > 1) {
    warnings.push(
      `${source}: a pack of ${packs}, so every line - postage and making included - is counted ${packs} times, as the sheet does.`,
    );
  }

  const lines = row.lines.map((line) => {
    const { value, subPenny } = pence(line.amount);
    if (subPenny) {
      warnings.push(`${source}: "${tidy(line.label)}" cost £${line.amount}, less than a penny; brought in as 1p.`);
    }

    return {
      label: tidy(line.label),
      unitPence: value,
      quantityHundredths: Math.round(line.quantity * 100) * packs,
    };
  });

  const note = row.note.trim();

  return {
    entry: {
      source,
      note: note.length > 0 ? note : null,
      vatRate: Math.round(row.vat * 100),
      pricePence: pence(row.price).value,
      lines,
      photoFile: row.photo,
      photoHash: row.phash,
      photoFilename: row.filename,
    },
    warnings,
  };
}
