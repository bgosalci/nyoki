"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { ui } from "@/lib/brand/ui";

/**
 * A table row that drags from anywhere on it with a mouse - dnd-kit's
 * pointer listener sits on the whole row - and from its handle with the
 * keyboard or a finger: on touch, the rest of the row scrolls the page as
 * usual. It moves up and down only. Shared by the products and categories
 * lists, each of which handles the handle's keys itself.
 */
export function SortableRow({
  id,
  name,
  lifted,
  onHandleKey,
  children,
}: {
  id: string;
  name: string;
  /** Picked up from the keyboard. */
  lifted: boolean;
  onHandleKey: (event: React.KeyboardEvent) => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      onPointerDown={listeners?.onPointerDown as React.PointerEventHandler | undefined}
      style={{ transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null), transition }}
      className={`cursor-grab border-b active:cursor-grabbing ${ui.tableRow} ${isDragging || lifted ? `relative z-10 shadow-lg ${ui.card}` : ""}`}
    >
      <td className="py-3 pr-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          aria-pressed={lifted || undefined}
          onKeyDown={onHandleKey}
          data-handle={id}
          aria-label={`Move ${name}`}
          title="Drag to move, or press space and use the arrow keys"
          className={`grid size-9 touch-none place-items-center rounded-md border ${ui.rule} ${ui.navItem}`}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 fill-current">
            {[5, 10, 15].map((y) => (
              <g key={y}>
                <circle cx="7.5" cy={y} r="1.6" />
                <circle cx="12.5" cy={y} r="1.6" />
              </g>
            ))}
          </svg>
        </button>
      </td>
      {children}
    </tr>
  );
}
