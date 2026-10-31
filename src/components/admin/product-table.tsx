"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { BulkPriceDialog } from "@/components/admin/bulk-price-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PinnedHeight } from "@/components/admin/pinned-height";
import { ProductThumbnail } from "@/components/admin/product-thumbnail";
import { SortableRow } from "@/components/admin/sortable-row";
import { PINNED_BLOCK_CLASS, Th } from "@/components/admin/th";
import { ui } from "@/lib/brand/ui";
import { formatPence } from "@/lib/money";
import { rememberProductList } from "@/lib/products/browse";
import { moveInList, placeFor, type Place } from "@/lib/products/ordering";
import type { RepriceFields } from "@/lib/products/repricing";
import type { ProductStatus } from "@/lib/products/validate";

export interface ProductRow {
  id: string;
  name: string;
  status: ProductStatus;
  pricePence: number;
  stock: number;
  madeToOrder: boolean;
  oneOfAKind: boolean;
  image: { url: string; alt: string | null } | null;
  /** Its categories by their places in the tree - "Cards › Christmas Cards" - as its Details tab shows them. */
  categories: string[];
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

/** The list's groups, in the order the page sends them. */
const STATUS_ORDER: readonly ProductStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];

const DRAG_INSTRUCTIONS =
  "To move a piece, press space or enter to pick it up, use the up and down arrow keys to move it, and press space or enter again to drop it. Press escape to cancel.";

/**
 * The products list, with a checkbox per row and actions that apply to
 * whatever is chosen.
 *
 * The page's own header - title, filters, count - is passed in and rendered
 * inside the pinned block together with the bulk bar. The bar belongs there
 * rather than above the rows: scrolled away from the rows it acts on, "1
 * selected" is a claim you cannot check. Putting it inside the block that is
 * already measured means the column headers settle beneath it without a
 * second sticky layer to keep in step with the first.
 *
 * A single piece is priced on its own Price tab, beside what it costs to make;
 * this is where a price changes across many at once. That previews itself
 * first: the old prices are kept nowhere, so there is nothing to undo it with.
 *
 * Archiving and deleting are both offered because they are different things:
 * archiving takes a product off the shop and can be undone, deleting removes
 * it for good. Deleting is safe for order history - a line records the name
 * and price it sold at, so an old order still reads correctly afterwards -
 * but it is still permanent, so it asks first.
 *
 * A row drags into a new place from anywhere on it, which is the shop's
 * order too; a click still opens or ticks it, since a drag starts only after
 * a few pixels' travel. Drafts, active and archived pieces stay in their own
 * groups: a row dropped among another group's lands at the nearest end of
 * its own. A move shows at once and is saved behind it; one that cannot be
 * saved is put back, and says so.
 *
 * Each row's handle is the way in from the keyboard - space to pick the
 * piece up, an arrow moves it one place, space puts it down, escape puts it
 * back - and for touch, where the rest of the row scrolls the page. The
 * keyboard is handled here rather than by dnd-kit's sensor, which scrolls
 * the page instead of moving a row when the next one is below the middle of
 * the screen - with rows this tall, nearly always.
 */
export function ProductTable({
  rows,
  header,
  setStatus,
  remove,
  reprice,
  move,
}: {
  rows: ProductRow[];
  /** Rendered by the page, pinned here so the bulk bar can share the block. */
  header?: React.ReactNode;
  /** Returns the names of any it would not make active, for want of a price. */
  setStatus: (ids: string[], status: ProductStatus) => Promise<{ unpriced: string[] }>;
  remove: (ids: string[]) => Promise<void>;
  reprice: (ids: string[], fields: RepriceFields) => Promise<void>;
  /** Saves a piece dropped just before or after another. */
  move: (id: string, targetId: string, place: Place) => Promise<{ ok: boolean }>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [unpriced, setUnpriced] = useState<string[]>([]);
  const [moveFailed, setMoveFailed] = useState(false);

  // The rows as arranged here: a move shows at once, before the server has
  // answered. Fresh rows from the server - after a save, a filter - start
  // the arrangement again from theirs.
  const [arranged, setArranged] = useState(rows);
  const [basis, setBasis] = useState(rows);
  if (rows !== basis) {
    setBasis(rows);
    setArranged(rows);
  }

  const dndId = useId();
  const sensors = useSensors(
    // A few pixels' travel first, so a click on a row is only a click.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // A piece picked up from the keyboard, and the arrangement it was picked
  // up from, to go back to on escape.
  const [lifted, setLifted] = useState<{ id: string; from: ProductRow[] } | null>(null);
  const [said, setSaid] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);

  // Moving a row moves its element, which can drop the focus; the piece
  // being moved keeps it.
  useLayoutEffect(() => {
    if (!lifted) return;
    tableRef.current?.querySelector<HTMLElement>(`[data-handle="${lifted.id}"]`)?.focus();
  }, [arranged, lifted]);

  // What a product page steps through with Previous and Next: this list as it
  // is shown now, in this order and under these filters.
  useEffect(() => {
    rememberProductList({
      href: window.location.pathname + window.location.search,
      items: arranged.map(({ id, name }) => ({ id, name })),
    });
  }, [arranged]);

  // Kept in the table's order, so an action reads the same way the list does.
  const chosen = arranged.filter((row) => selected.has(row.id)).map((row) => row.id);
  const allChosen = rows.length > 0 && chosen.length === rows.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function apply(action: () => Promise<unknown>) {
    setUnpriced([]);
    await action();
    setSelected(new Set());
  }

  async function changeStatus(status: ProductStatus) {
    setUnpriced([]);
    const result = await setStatus(chosen, status);
    setUnpriced(result?.unpriced ?? []);
    setSelected(new Set());
  }

  /** Saves a move already shown; one that cannot be saved puts `undo` back. */
  async function save(id: string, targetId: string, place: Place, undo: ProductRow[]) {
    setMoveFailed(false);
    const saved = await move(id, targetId, place).catch(() => ({ ok: false }));
    if (!saved.ok) {
      setArranged(undo);
      setMoveFailed(true);
    }
  }

  /**
   * Where a row dropped on another lands: beside it - or, dropped among
   * another group's rows, at the nearest end of its own. Dragged up past the
   * drafts, an active piece means "first of the active ones". Null for a
   * drop that leaves it where it was.
   */
  function landing(moving: ProductRow, onto: ProductRow): { target: ProductRow; place: Place } | null {
    if (onto.status === moving.status) {
      return { target: onto, place: placeFor(arranged.map((row) => row.id), moving.id, onto.id) };
    }
    const own = arranged.filter((row) => row.status === moving.status);
    const above = STATUS_ORDER.indexOf(onto.status) < STATUS_ORDER.indexOf(moving.status);
    const edge = above ? own[0] : own[own.length - 1];
    return edge.id === moving.id ? null : { target: edge, place: above ? "before" : "after" };
  }

  async function drop({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const moving = arranged.find((row) => row.id === active.id);
    const onto = arranged.find((row) => row.id === over.id);
    const lands = moving && onto ? landing(moving, onto) : null;
    if (!moving || !lands) return;

    const before = arranged;
    setArranged(moveInList(arranged, moving.id, lands.target.id, lands.place));
    await save(moving.id, lands.target.id, lands.place, before);
  }

  /** The keyboard on a row's handle: pick up, move a place at a time, put down or back. */
  function onHandleKey(event: React.KeyboardEvent, row: ProductRow) {
    const own = arranged.filter((other) => other.status === row.status);
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

  async function putDown(row: ProductRow, from: ProductRow[]) {
    setLifted(null);
    const own = arranged.filter((other) => other.status === row.status);
    const at = own.findIndex((other) => other.id === row.id);
    const was = from.filter((other) => other.status === row.status).findIndex((other) => other.id === row.id);
    if (at === was) {
      setSaid(`${row.name} was put down where it was.`);
      return;
    }

    setSaid(`${row.name} put down, ${at + 1} of ${own.length}.`);
    // Saved beside its new neighbour: after the one above it, or before the one below when it is first.
    const [target, place]: [ProductRow, Place] = at > 0 ? [own[at - 1], "after"] : [own[1], "before"];
    await save(row.id, target.id, place, from);
  }

  const nameOf = (id: UniqueIdentifier) => arranged.find((row) => row.id === id)?.name ?? "the piece";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} is over ${nameOf(over.id)}.` : `${nameOf(active.id)} is not over a piece.`,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)} was dropped on ${nameOf(over.id)}.` : `${nameOf(active.id)} was put back.`,
    onDragCancel: ({ active }) => `Moving ${nameOf(active.id)} was cancelled. It is back where it was.`,
  };

  const groups = STATUS_ORDER.map((status) => arranged.filter((row) => row.status === status)).filter((group) => group.length > 0);

  const actionClass = `rounded-md px-3 py-1.5 text-sm ${ui.buttonSecondary}`;

  return (
    <>
      <PinnedHeight className={PINNED_BLOCK_CLASS}>
        {header}

        <p className={`mt-1 text-sm ${ui.mutedOnPage}`}>
          Drag a row to change its place on the shop. Drafts, active and archived pieces each keep to their own group.
        </p>

        {chosen.length > 0 ? (
          <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-md border p-3 ${ui.card} ${ui.ruleOnPage}`}>
            <p className="text-sm font-medium">{chosen.length} selected</p>
            {/* Beside the count it undoes, and away from Delete. */}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className={`-ml-1 rounded-md px-2 py-1.5 text-sm underline underline-offset-4 ${ui.mutedOnPage}`}
            >
              Clear selection
            </button>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPricing(true)} className={actionClass}>
                Change price
              </button>
              <button type="button" onClick={() => changeStatus("ACTIVE")} className={actionClass}>
                Make active
              </button>
              <button type="button" onClick={() => changeStatus("DRAFT")} className={actionClass}>
                Make draft
              </button>
              <button type="button" onClick={() => changeStatus("ARCHIVED")} className={actionClass}>
                Archive
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-md px-3 py-1.5 text-sm text-red-700 underline underline-offset-4 dark:text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}

        {moveFailed ? (
          <p role="status" className={`mt-4 rounded-md border p-3 text-sm ${ui.card} ${ui.ruleOnPage}`}>
            That move could not be saved, so the list is as it was. Try it again.
          </p>
        ) : null}

        {unpriced.length > 0 ? (
          <p role="status" className={`mt-4 rounded-md border p-3 text-sm ${ui.card} ${ui.ruleOnPage}`}>
            Left as {unpriced.length === 1 ? "a draft" : "drafts"}, because {unpriced.length === 1 ? "it has" : "they have"} no
            price yet: {unpriced.join(", ")}. Price {unpriced.length === 1 ? "it on its" : "them on their"} Price tab first.
          </p>
        ) : null}
      </PinnedHeight>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => void drop(event)}
        accessibility={{ announcements, screenReaderInstructions: { draggable: DRAG_INSTRUCTIONS } }}
      >
        <table ref={tableRef} className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <Th srOnly>Order</Th>
              <Th>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allChosen}
                  onChange={() => setSelected(allChosen ? new Set() : new Set(rows.map((row) => row.id)))}
                  className={`size-4 align-middle ${ui.checkbox}`}
                />
              </Th>
              <Th srOnly>Photo</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th align="right">Price</Th>
              <Th align="right">Stock</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <SortableContext key={group[0].status} items={group.map((row) => row.id)} strategy={verticalListSortingStrategy}>
                {group.map((row) => (
                  <SortableRow
                    key={row.id}
                    id={row.id}
                    name={row.name}
                    lifted={lifted?.id === row.id}
                    onHandleKey={(event) => onHandleKey(event, row)}
                  >
                    <td className="py-3 pr-4">
                      <input
                        type="checkbox"
                        aria-label={row.name}
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        className={`size-4 align-middle ${ui.checkbox}`}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      {/* The photo opens the product too. The name is the link a
                          keyboard or screen reader meets; this is the same place
                          again, for the mouse, so it is kept out of their way. */}
                      <Link href={`/admin/products/${row.id}`} tabIndex={-1} aria-hidden="true" className="block w-fit">
                        <ProductThumbnail image={row.image} size="large" />
                      </Link>
                    </td>
                    <td className="py-3 pr-4">
                      <Link href={`/admin/products/${row.id}`} className="font-medium underline-offset-4 hover:underline">
                        {row.name}
                      </Link>
                      {row.oneOfAKind ? <span className={`ml-2 text-xs ${ui.mutedOnPage}`}>one of a kind</span> : null}
                      {/* Filled, not outlined like the filter's pills above, which are links: these only say. */}
                      {row.categories.length > 0 ? (
                        <ul aria-label={`Categories of ${row.name}`} className="mt-1.5 flex flex-wrap gap-1.5">
                          {row.categories.map((path) => (
                            <li key={path} className={`rounded-full px-2.5 py-0.5 text-xs ${ui.badgeQuiet}`}>
                              {path}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={`mt-1.5 text-xs ${ui.mutedOnPage}`}>In no category</p>
                      )}
                    </td>
                    <td className={`py-3 pr-4 ${ui.mutedOnPage}`}>{STATUS_LABEL[row.status]}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{formatPence(row.pricePence)}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">{row.madeToOrder ? "made to order" : row.stock}</td>
                  </SortableRow>
                ))}
              </SortableContext>
            ))}
          </tbody>
        </table>
      </DndContext>

      {/* What the keyboard is doing, for a screen reader. */}
      <p data-testid="order-announcer" aria-live="assertive" aria-atomic="true" className="sr-only">
        {said}
      </p>

      <BulkPriceDialog
        open={pricing}
        rows={arranged.filter((row) => selected.has(row.id))}
        onCancel={() => setPricing(false)}
        onApply={(fields) => {
          setPricing(false);
          return apply(() => reprice(chosen, fields));
        }}
      />

      <ConfirmDialog
        open={confirming}
        title={`Delete ${chosen.length} ${chosen.length === 1 ? "product" : "products"}?`}
        description="Their photos go too. This cannot be undone. Past orders keep the name and price they sold at, so order history is unaffected."
        confirmLabel={`Delete ${chosen.length} ${chosen.length === 1 ? "product" : "products"}`}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void apply(() => remove(chosen));
        }}
      />
    </>
  );
}
