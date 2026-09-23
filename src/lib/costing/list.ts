import { priceBreakdown, productionCostPence, type CostLineInput } from "@/lib/costing/costing";

/** A row of the pricing list: what one piece costs, sells for, and leaves. */
export interface PricingRow {
  id: string;
  name: string;
  image: { url: string; alt: string | null } | null;
  pricePence: number;
  costed: boolean;
  costPence: number;
  /** Null until costed: without costs, the whole price would read as profit. */
  profitPence: number | null;
  costMultiple: number | null;
}

export function pricingRow(product: {
  id: string;
  name: string;
  image: { url: string; alt: string | null } | null;
  pricePence: number;
  vatRate: number;
  costLines: CostLineInput[];
}): PricingRow {
  const costed = product.costLines.length > 0;
  const costPence = productionCostPence(product.costLines);
  const breakdown = priceBreakdown({ pricePence: product.pricePence, costPence, vatRate: product.vatRate });

  return {
    id: product.id,
    name: product.name,
    image: product.image,
    pricePence: product.pricePence,
    costed,
    costPence,
    profitPence: costed ? breakdown.profitPence : null,
    costMultiple: costed ? breakdown.costMultiple : null,
  };
}

export type PricingView = "all" | "uncosted" | "loss";

const VIEWS: readonly PricingView[] = ["all", "uncosted", "loss"];

export function parsePricingView(params: Record<string, string | string[] | undefined>): { q: string; view: PricingView } {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const view = first(params.view) as PricingView;

  return { q: first(params.q).trim(), view: VIEWS.includes(view) ? view : "all" };
}

export function inView(row: PricingRow, view: PricingView): boolean {
  if (view === "uncosted") return !row.costed;
  if (view === "loss") return row.profitPence !== null && row.profitPence < 0;
  return true;
}

export function pricingSummary(rows: readonly PricingRow[]): { total: number; costed: number; atALoss: number } {
  return {
    total: rows.length,
    costed: rows.filter((row) => row.costed).length,
    atALoss: rows.filter((row) => inView(row, "loss")).length,
  };
}
