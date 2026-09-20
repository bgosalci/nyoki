import Link from "next/link";

import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { ui } from "@/lib/brand/ui";
import { db } from "@/lib/db";
import { formatPence } from "@/lib/money";

const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

function describe(type: string, value: number): string {
  return type === "PERCENTAGE" ? `${value}% off` : `${formatPence(value)} off`;
}

/** Live right now: switched on, inside its dates, and not used up. */
function isLive(code: { active: boolean; startsAt: Date; endsAt: Date | null; usageLimit: number | null; usedCount: number }, now: Date): boolean {
  if (!code.active) return false;
  if (code.startsAt > now) return false;
  if (code.endsAt !== null && code.endsAt <= now) return false;
  if (code.usageLimit !== null && code.usedCount >= code.usageLimit) return false;
  return true;
}

export default async function CodesPage() {
  const now = new Date();
  const codes = await db.discountCode.findMany({ orderBy: [{ active: "desc" }, { startsAt: "desc" }] });

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Promo codes</h1>
          <Link href="/admin/codes/new" className={`rounded-md px-3.5 py-2 text-sm font-medium ${ui.buttonPrimary}`}>
            New code
          </Link>
        </div>
        <p className={`mt-4 text-sm ${ui.mutedOnPage}`}>{codes.length} codes</p>
      </PinnedHeight>

      {codes.length === 0 ? (
        <div className={`mt-8 rounded-lg border border-dashed p-10 text-center ${ui.ruleOnPage}`}>
          <p className={`text-sm ${ui.mutedOnPage}`}>
            No promo codes yet. A code takes a percentage or an amount off the whole basket when a shopper types it at checkout.
          </p>
          <Link href="/admin/codes/new" className="mt-2 inline-block text-sm underline underline-offset-4">
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Runs</Th>
                <Th align="right">Used</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.id} className={`border-b ${ui.tableRow}`}>
                  <td className="py-3 pr-4">
                    <Link href={`/admin/codes/${code.id}`} className="font-mono font-medium tracking-wider underline-offset-4 hover:underline">
                      {code.code}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 tabular-nums">
                    {describe(code.type, code.value)}
                    {code.minSpendPence ? (
                      <span className={`ml-2 text-xs ${ui.mutedOnPage}`}>over {formatPence(code.minSpendPence)}</span>
                    ) : null}
                  </td>
                  <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>
                    {when.format(code.startsAt)}
                    {code.endsAt ? ` → ${when.format(code.endsAt)}` : " → until switched off"}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {code.usedCount}
                    {code.usageLimit !== null ? ` / ${code.usageLimit}` : ""}
                  </td>
                  <td className="py-3 pr-4">
                    {isLive(code, now) ? (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                        Live
                      </span>
                    ) : (
                      <span className={`text-xs ${ui.mutedOnPage}`}>
                        {!code.active ? "Off" : code.startsAt > now ? "Scheduled" : code.usageLimit !== null && code.usedCount >= code.usageLimit ? "Used up" : "Ended"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
