"use client";

import {
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useDndContext,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { PinnedHeight } from "@/components/admin/pinned-height";
import { SortableRow } from "@/components/admin/sortable-row";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { visibleBranches, type VisibleBranch } from "@/lib/categories/collapse";
import { categoryLanding } from "@/lib/categories/ordering";
import { offShopBecause } from "@/lib/categories/visibility";
import { flattenTree } from "@/lib/categories/tree";
import { moveInList, type Place } from "@/lib/products/ordering";

const STORAGE_KEY = "nyoki-admin-categories-collapsed";

const DRAG_INSTRUCTIONS =
  "To move a category, press space or enter to pick it up, use the up and down arrow keys to move it among the others in its group, and press space or enter again to drop it. Press escape to cancel.";

export interface CategoryTableRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  productCount: number;
  /** Switched on; it is on the shop only if every category above it is too. */
  active: boolean;
}

/**
 * Which groups are shut is external state React does not own, so it is read
 * through useSyncExternalStore rather than copied into state by an effect.
 * The snapshot is the stored string itself: two reads of an unchanged
 * preference are equal by value, which is what the hook compares.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    // Private windows and blocked site data both throw. Open everything.
    return "";
  }
}

/** The server cannot know this browser's preference, so it renders the tree open. */
function getServerSnapshot(): string {
  return "";
}

function remember(ids: Iterable<string>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, [...ids].join(","));
  } catch {
    // Not remembering is a smaller problem than not working.
  }
  for (const listener of listeners) listener();
}

/**
 * The categories list, with each group able to be shut, in the shop's order.
 *
 * The catalogue has a few groups and a long tail of types beneath them, which
 * makes the open list hard to scan. A shut group says how many rows it is
 * hiding rather than simply swallowing them, and the choice is remembered per
 * browser so a long list does not reopen itself on every visit.
 *
 * A row drags into a new place among its siblings - the departments among
 * themselves, the types within their group - and that is the order the
 * shop's header, footer, home page and tiles follow. A group takes what is
 * inside it along: picked up, it folds its types away, so it moves as one
 * row. A row dropped among another group's rows lands as near there as its
 * own group allows; giving a category another parent is its own page's job.
 * A move shows at once and is saved behind it; one that cannot be saved is
 * put back, and says so. The keyboard works the handle as on the products
 * list, for the reason given there.
 *
 * Rows arrive flat, in the shop's order, and are made a tree here, since a
 * move reorders the flat list and the tree is drawn again from it.
 */
export function CategoryTable({
  categories,
  header,
  move,
}: {
  categories: CategoryTableRow[];
  /** Rendered by the page, pinned here together with the list's own controls. */
  header?: React.ReactNode;
  /** Saves a category dropped just before or after a sibling. */
  move: (id: string, targetId: string, place: Place) => Promise<{ ok: boolean }>;
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const collapsed = useMemo(() => new Set(raw.length > 0 ? raw.split(",") : []), [raw]);

  // The rows as arranged here: a move shows at once, before the server has
  // answered. Fresh rows from the server start the arrangement again.
  const [arranged, setArranged] = useState(categories);
  const [basis, setBasis] = useState(categories);
  if (categories !== basis) {
    setBasis(categories);
    setArranged(categories);
  }

  const [moveFailed, setMoveFailed] = useState(false);

  const dndId = useId();
  const sensors = useSensors(
    // A few pixels' travel first, so a click on a row is only a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // A category picked up from the keyboard, and the arrangement it was
  // picked up from, to go back to on escape.
  const [lifted, setLifted] = useState<{ id: string; from: CategoryTableRow[] } | null>(null);
  const [said, setSaid] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);

  // Moving a row moves its element, which can drop the focus; the category
  // being moved keeps it.
  useLayoutEffect(() => {
    if (!lifted) return;
    tableRef.current?.querySelector<HTMLElement>(`[data-handle="${lifted.id}"]`)?.focus();
  }, [arranged, lifted]);

  const branches = useMemo(() => flattenTree(arranged), [arranged]);
  const offShop = useMemo(() => offShopBecause(arranged), [arranged]);

  const parents = useMemo(
    () => visibleBranches(branches, new Set()).filter((branch) => branch.hasChildren).map((branch) => branch.row.id),
    [branches],
  );

  /** What is on screen with `also` shut as well: a group being dragged folds away what is inside it. */
  const shownWith = (also: UniqueIdentifier | null) =>
    visibleBranches(branches, also === null ? collapsed : new Set([...collapsed, String(also)]));

  const shutCount = parents.filter((id) => collapsed.has(id)).length;

  function toggle(id: string) {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    remember(next);
  }

  const siblingsOf = (row: CategoryTableRow) => arranged.filter((other) => other.parentId === row.parentId);

  /** Saves a move already shown; one that cannot be saved puts `undo` back. */
  async function save(id: string, targetId: string, place: Place, undo: CategoryTableRow[]) {
    setMoveFailed(false);
    const saved = await move(id, targetId, place).catch(() => ({ ok: false }));
    if (!saved.ok) {
      setArranged(undo);
      setMoveFailed(true);
    }
  }

  async function drop({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const shown = shownWith(active.id).map((branch) => branch.row);
    const lands = categoryLanding(shown, String(active.id), String(over.id));
    if (!lands) return;

    const before = arranged;
    setArranged(moveInList(arranged, String(active.id), lands.target, lands.place));
    await save(String(active.id), lands.target, lands.place, before);
  }

  /** The keyboard on a row's handle: pick up, move a place at a time among its siblings, put down or back. */
  function onHandleKey(event: React.KeyboardEvent, row: CategoryTableRow) {
    const own = siblingsOf(row);
    const at = own.findIndex((other) => other.id === row.id);
    const holding = lifted?.id === row.id ? lifted : null;

    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (holding) {
        void putDown(row, holding.from);
      } else {
        setLifted({ id: row.id, from: arranged });
        setSaid(`Picked up ${row.name}, ${at + 1} of ${own.length}. Use the up and down arrow keys to move it, space to put it down, or escape to cancel.`);
      }
      return;
    }
    if (!holding) return;

    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const up = event.key === "ArrowUp";
      const neighbour = own[at + (up ? -1 : 1)];
      if (!neighbour) {
        setSaid(`${row.name} is already ${up ? "first" : "last"}.`);
        return;
      }
      setArranged(moveInList(arranged, row.id, neighbour.id, up ? "before" : "after"));
      setSaid(`${row.name}, ${at + (up ? 0 : 2)} of ${own.length}.`);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setArranged(holding.from);
      setLifted(null);
      setSaid(`${row.name} is back where it was.`);
    }
  }

  async function putDown(row: CategoryTableRow, from: CategoryTableRow[]) {
    setLifted(null);
    const own = siblingsOf(row);
    const at = own.findIndex((other) => other.id === row.id);
    const was = from.filter((other) => other.parentId === row.parentId).findIndex((other) => other.id === row.id);
    if (at === was) {
      setSaid(`${row.name} was put down where it was.`);
      return;
    }

    setSaid(`${row.name} put down, ${at + 1} of ${own.length}.`);
    // Saved beside its new neighbour: after the one above it, or before the one below when it is first.
    const [target, place]: [CategoryTableRow, Place] = at > 0 ? [own[at - 1], "after"] : [own[1], "before"];
    await save(row.id, target.id, place, from);
  }

  const nameOf = (id: UniqueIdentifier) => arranged.find((row) => row.id === id)?.name ?? "the category";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} is over ${nameOf(over.id)}.` : `${nameOf(active.id)} is not over a category.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} was dropped on ${nameOf(over.id)}.` : `${nameOf(active.id)} was put back.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled. It is back where it was.`,
  };

  const controlClass = `rounded-md px-2.5 py-1 text-xs ${ui.buttonSecondary} disabled:opacity-40`;

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        {header}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className={`text-sm ${ui.mutedOnPage}`}>
            Drag a category to change its place on the shop. Each keeps to its own group, and takes what is inside it
            along.
          </p>
          {parents.length > 0 ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => remember([])} disabled={shutCount === 0} className={controlClass}>
                Expand all
              </button>
              <button
                type="button"
                onClick={() => remember(parents)}
                disabled={shutCount === parents.length}
                className={controlClass}
              >
                Collapse all
              </button>
            </div>
          ) : null}
        </div>

        {moveFailed ? (
          <p role="status" className={`mt-4 rounded-md border p-3 text-sm ${ui.card} ${ui.ruleOnPage}`}>
            That move could not be saved, so the list is as it was. Try it again.
          </p>
        ) : null}
      </PinnedHeight>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        // A group folds its types away as it is picked up, which moves every
        // row below it; the rows are measured afresh rather than once.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragEnd={(event) => void drop(event)}
        accessibility={{ announcements, screenReaderInstructions: { draggable: DRAG_INSTRUCTIONS } }}
      >
        <table ref={tableRef} className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th srOnly>Order</Th>
              <Th>Name</Th>
              <Th>Web address</Th>
              <Th align="right">Products</Th>
            </tr>
          </thead>
          <tbody>
            <CategoryRows
              shownWith={shownWith}
              offShop={offShop}
              collapsed={collapsed}
              lifted={lifted?.id ?? null}
              onToggle={toggle}
              onHandleKey={onHandleKey}
            />
          </tbody>
        </table>
      </DndContext>

      {/* What the keyboard is doing, for a screen reader. */}
      <p data-testid="category-order-announcer" aria-live="assertive" aria-atomic="true" className="sr-only">
        {said}
      </p>
    </>
  );
}

/**
 * The rows, drawn inside the drag so they can ask it which row is moving: a
 * group being dragged folds away what is inside it. Asked of dnd-kit rather
 * than kept in state beside it - a drag let go of before it had properly
 * begun ends with neither a drop nor a cancel, and state set when it started
 * left that group folded for good.
 */
function CategoryRows({
  shownWith,
  offShop,
  collapsed,
  lifted,
  onToggle,
  onHandleKey,
}: {
  shownWith: (also: UniqueIdentifier | null) => VisibleBranch<CategoryTableRow>[];
  /** What keeps each category off the shop, by id: itself, or an inactive category above it. */
  offShop: ReadonlyMap<string, CategoryTableRow>;
  collapsed: ReadonlySet<string>;
  /** The category picked up from the keyboard. */
  lifted: string | null;
  onToggle: (id: string) => void;
  onHandleKey: (event: React.KeyboardEvent, row: CategoryTableRow) => void;
}) {
  const { active } = useDndContext();
  const dragging = active?.id ?? null;
  const rows = shownWith(dragging);

  return (
    <SortableContext items={rows.map((branch) => branch.row.id)} strategy={verticalListSortingStrategy}>
      {rows.map(({ row, depth, hasChildren, childCount }) => {
        const shut = collapsed.has(row.id);
        // Shut, or folded for the length of its own drag.
        const folded = hasChildren && (shut || dragging === row.id);
        const offBecause = offShop.get(row.id);

        return (
          <SortableRow
            key={row.id}
            id={row.id}
            name={row.name}
            lifted={lifted === row.id}
            onHandleKey={(event) => onHandleKey(event, row)}
          >
            <td className="py-3 pr-4">
              <span style={{ paddingLeft: `${depth * 1.25}rem` }} className="flex items-center gap-1.5">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => onToggle(row.id)}
                    aria-expanded={!shut}
                    aria-label={`${shut ? "Expand" : "Collapse"} ${row.name}`}
                    className={`-my-1 rounded p-1 ${ui.navItem}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="size-4">
                      <path d={folded ? "m9 6 6 6-6 6" : "m6 9 6 6 6-6"} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  // Keeps the names of childless rows in line with the rest.
                  <span aria-hidden="true" className="size-6" />
                )}

                <Link href={`/admin/categories/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                  {row.name}
                </Link>

                {offBecause?.id === row.id ? (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${ui.badgeQuiet}`}>Inactive</span>
                ) : offBecause ? (
                  <span className={`text-xs ${ui.mutedOnPage}`}>Off the shop: {offBecause.name} is inactive</span>
                ) : null}

                {folded ? <span className={`text-xs ${ui.mutedOnPage}`}>{childCount} hidden</span> : null}
              </span>
            </td>
            <td className={`py-3 pr-4 font-mono text-xs ${ui.mutedOnPage}`}>/{row.slug}</td>
            <td className="py-3 pr-4 text-right tabular-nums">{row.productCount}</td>
          </SortableRow>
        );
      })}
    </SortableContext>
  );
}
