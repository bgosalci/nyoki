"use client";

import { ui } from "@/lib/brand/ui";
import { blankCostRow, rowCostPence, rowsCostPence, type CostRow } from "@/lib/costing/rows";
import { formatPence } from "@/lib/money";

const lineInput = `w-full rounded-md border px-2 py-1.5 text-sm outline-none ${ui.input}`;

/**
 * The lines of what something costs, to edit: what, cost each, how many, and
 * the running total. Posted as `lineLabel`, `lineUnit` and `lineQuantity`,
 * which `parseCostLines` reads back.
 *
 * Controlled: the form around it keeps the rows, since a piece's Price tab
 * works its profit out from them as they are typed.
 */
export function CostLinesTable({
  rows,
  onChange,
  error,
}: {
  rows: CostRow[];
  onChange: (rows: CostRow[]) => void;
  error?: string;
}) {
  const update = (key: number, patch: Partial<CostRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <>
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className={`border-b text-left ${ui.tableHead}`}>
            <th className="py-2 pr-2 font-medium">What</th>
            <th className="w-28 py-2 pr-2 font-medium">Cost each</th>
            <th className="w-20 py-2 pr-2 font-medium">How many</th>
            <th className="w-24 py-2 pr-2 text-right font-medium">Cost</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={`border-b ${ui.tableRow}`}>
              <td className="py-1.5 pr-2">
                <input aria-label="What" name="lineLabel" value={row.label} onChange={(e) => update(row.key, { label: e.target.value })} className={lineInput} />
              </td>
              <td className="py-1.5 pr-2">
                <input aria-label="Cost each" name="lineUnit" inputMode="decimal" value={row.unit} onChange={(e) => update(row.key, { unit: e.target.value })} className={lineInput} />
              </td>
              <td className="py-1.5 pr-2">
                <input aria-label="How many" name="lineQuantity" inputMode="decimal" value={row.quantity} onChange={(e) => update(row.key, { quantity: e.target.value })} className={lineInput} />
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatPence(rowCostPence(row))}</td>
              <td className="py-1.5 text-right">
                <button
                  type="button"
                  aria-label={`Remove ${row.label || "this line"}`}
                  onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                  className={`rounded px-2 py-1 ${ui.navItem}`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="mt-3 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onChange([...rows, blankCostRow()])}
          className={`rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`}
        >
          Add a line
        </button>
        <dl className="flex items-baseline gap-4 text-sm font-semibold">
          <dt>Total cost</dt>
          <dd className="text-right tabular-nums">{formatPence(rowsCostPence(rows))}</dd>
        </dl>
      </div>
    </>
  );
}
