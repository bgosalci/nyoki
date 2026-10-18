import { PlusMinus } from "@/components/shop/plus-minus";
import { ui } from "@/lib/brand/ui";

/**
 * A titled section that opens on a click, starting closed. It is marked with
 * a + in place of the browser's triangle, which rolls into a − as it opens.
 */
export function Disclosure({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={`group ${className}`}>
      <summary
        className={`flex cursor-pointer list-none items-center gap-3 text-base font-bold tracking-[0.14em] uppercase [&::-webkit-details-marker]:hidden ${ui.shopAccent}`}
      >
        <PlusMinus />
        <span>{title}</span>
      </summary>
      {children}
    </details>
  );
}
