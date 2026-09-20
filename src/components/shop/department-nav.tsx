import Link from "next/link";

export interface DepartmentGroup {
  slug: string;
  name: string;
  children: { slug: string; name: string }[];
}

/**
 * The department row, each with a drop-down of its sub-categories.
 *
 * Opening is pure CSS - group-hover for the mouse, group-focus-within for the
 * keyboard - so there is no JavaScript to load before the menu works, and
 * tabbing through the links opens it exactly as hovering does. On a touch
 * screen, where neither applies, tapping the department still goes to its
 * page, which lists the same sub-categories.
 *
 * The panel is positioned against the header rather than the link, so it spans
 * the full width: Clothes has around thirty sub-categories and needs columns.
 * The links carry the row's vertical padding themselves, leaving no dead gap
 * between a department and its panel for the pointer to fall through.
 */
export function DepartmentNav({ groups }: { groups: DepartmentGroup[] }) {
  return (
    <nav aria-label="Departments">
      <ul className="flex flex-wrap items-center justify-center gap-x-8 md:justify-start">
        {groups.map((group) => (
          <li key={group.slug} className="group">
            <Link
              href={`/shop/${group.slug}`}
              className="block py-3 text-lg text-nyoki-navy hover:underline hover:underline-offset-4"
            >
              {group.name}
            </Link>

            {group.children.length > 0 ? (
              <div
                role="group"
                aria-label={`${group.name} categories`}
                className="invisible absolute inset-x-0 top-full z-40 border-b border-nyoki-light-slate bg-nyoki-beige opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
              >
                <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-2 px-4 py-6 sm:grid-cols-3 sm:px-6 lg:grid-cols-4">
                  {group.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/shop/${child.slug}`}
                        className="block py-1 text-sm text-nyoki-navy hover:underline hover:underline-offset-4"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </li>
        ))}

        <li>
          <Link href="/shop" className="block py-3 text-lg text-nyoki-navy hover:underline hover:underline-offset-4">
            Everything
          </Link>
        </li>
      </ul>
    </nav>
  );
}
