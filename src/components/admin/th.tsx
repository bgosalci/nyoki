import { ui } from "@/lib/brand/ui";

/** The fixed top bar (3.5rem) plus whatever PinnedHeight block sits above the table. */
export const STICKY_TOP = "calc(3.5rem + var(--pinned-height, 0px))";

/** The classes a list's pinned title block uses, so every list pins the same way. */
export const PINNED_BLOCK_CLASS = `sticky top-14 z-20 -mx-6 -mt-6 px-6 pt-6 pb-4 md:-mx-10 md:-mt-10 md:px-10 md:pt-10 ${ui.page}`;

/**
 * A column header that stays put while the rows scroll. It paints the page
 * ground so rows pass beneath it, and takes its offset from the pinned block
 * above, if any. The table must not sit in an overflow container, or the
 * header would stick to that container instead of the page.
 */
export function Th({
  children,
  align = "left",
  srOnly = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  srOnly?: boolean;
}) {
  return (
    <th
      scope="col"
      style={{ top: STICKY_TOP }}
      className={`sticky z-10 border-b py-2.5 pr-4 font-medium ${align === "right" ? "text-right" : "text-left"} ${ui.page} ${ui.tableHead}`}
    >
      {srOnly ? <span className="sr-only">{children}</span> : children}
    </th>
  );
}
