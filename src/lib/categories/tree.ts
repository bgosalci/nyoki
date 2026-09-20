export interface TreeRow {
  id: string;
  parentId: string | null;
}

/**
 * Rows in depth-first order with each one's depth, so a flat list can be
 * rendered as a tree. Siblings keep their input order. Anything the walk cannot
 * reach - an orphan whose parent is gone, or a member of a cycle in corrupt
 * data - is appended at the top level rather than silently dropped.
 */
export function flattenTree<T extends TreeRow>(rows: readonly T[]): { row: T; depth: number }[] {
  const byParent = new Map<string | null, T[]>();
  for (const row of rows) {
    const siblings = byParent.get(row.parentId) ?? [];
    siblings.push(row);
    byParent.set(row.parentId, siblings);
  }

  const out: { row: T; depth: number }[] = [];
  const seen = new Set<string>();

  function walk(parentId: string | null, depth: number) {
    for (const row of byParent.get(parentId) ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push({ row, depth });
      walk(row.id, depth + 1);
    }
  }

  walk(null, 0);

  for (const row of rows) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      out.push({ row, depth: 0 });
    }
  }

  return out;
}
