import { ui } from "@/lib/brand/ui";

/** What changed in the basket since its pieces went in, said once, at the top of the basket or checkout. */
export function BasketChanges({ changes }: { changes: string[] }) {
  if (changes.length === 0) return null;

  return (
    <div role="status" className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-1 rounded-md bg-nyoki-accent-beige px-5 py-4">
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" aria-hidden="true" className="row-span-2 mt-0.5 size-[22px] stroke-nyoki-navy">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.01" strokeLinecap="round" />
      </svg>
      <p className="font-medium text-nyoki-ink">We&apos;ve updated your basket</p>
      <ul className={`flex flex-col gap-1 text-[15px] ${ui.shopMuted}`}>
        {changes.map((change) => (
          <li key={change}>{change}</li>
        ))}
      </ul>
    </div>
  );
}
