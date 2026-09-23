import { lineCostPence, productionCostPence } from "@/lib/costing/costing";
import type { EntryLine } from "@/lib/costing/import";
import { parseQuantityToHundredths } from "@/lib/costing/validate";
import { parsePoundsToPence } from "@/lib/money";

/**
 * A cost line as it is being typed: text, not yet numbers. Shared by every
 * form that edits cost lines - a piece's Price tab, a category's usual costs.
 */
export interface CostRow {
  /** Only for React to tell rows apart; never posted. */
  key: number;
  label: string;
  unit: string;
  quantity: string;
}

const pounds = (pence: number) => (pence / 100).toFixed(2);

/** 650 hundredths reads "6.5", 100 reads "1". */
export const hundredthsText = (h: number) => (h % 100 === 0 ? String(h / 100) : (h / 100).toFixed(2).replace(/0$/, ""));

let nextKey = 0;

export const toCostRow = (line: EntryLine): CostRow => ({
  key: nextKey++,
  label: line.label,
  unit: pounds(line.unitPence),
  quantity: hundredthsText(line.quantityHundredths),
});

export const blankCostRow = (): CostRow => ({ key: nextKey++, label: "", unit: "", quantity: "1" });

/** What a row costs as typed so far - nothing, until it can be read. */
export function rowCostPence(row: CostRow): number {
  const unitPence = parsePoundsToPence(row.unit.length > 0 ? row.unit : "0") ?? 0;
  const quantityHundredths = row.quantity.trim().length > 0 ? (parseQuantityToHundredths(row.quantity) ?? 0) : 100;
  return lineCostPence({ unitPence, quantityHundredths });
}

export function rowsCostPence(rows: readonly CostRow[]): number {
  return productionCostPence(rows.map((row) => ({ unitPence: rowCostPence(row), quantityHundredths: 100 })));
}
