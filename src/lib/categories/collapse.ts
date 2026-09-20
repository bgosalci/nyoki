/**
 * Collapsing a category tree that has already been flattened by
 * `flattenTree`: rows in depth-first order, each carrying its depth.
 *
 * Kept as a plain module rather than living in the component, so the rule -
 * what a shut parent hides - is testable on its own and the page can stay a
 * server component around it.
 */

export interface Branch<T> {
  row: T;
  depth: number;
}

export interface VisibleBranch<T> extends Branch<T> {
  hasChildren: boolean;
  /** Its own children, not everything beneath it. */
  childCount: number;
}

/** How many rows sit directly beneath the branch at `index`. */
function childrenOf<T>(branches: readonly Branch<T>[], index: number): number {
  const { depth } = branches[index];
  let count = 0;

  for (let i = index + 1; i < branches.length; i += 1) {
    if (branches[i].depth <= depth) break;
    if (branches[i].depth === depth + 1) count += 1;
  }

  return count;
}

/**
 * The rows still on screen, given the set of collapsed ids.
 *
 * A shut parent hides everything beneath it however deep, and whether or not
 * those rows are themselves expanded - being open inside something closed
 * counts for nothing. Their state is kept rather than cleared, so reopening a
 * parent restores the shape it was left in.
 */
export function visibleBranches<T extends { id: string }>(
  branches: readonly Branch<T>[],
  collapsed: ReadonlySet<string>,
): VisibleBranch<T>[] {
  const visible: VisibleBranch<T>[] = [];

  // The depth of the shallowest shut parent we are currently inside.
  let hiddenBelow: number | null = null;

  branches.forEach((branch, index) => {
    if (hiddenBelow !== null) {
      if (branch.depth > hiddenBelow) return;
      hiddenBelow = null;
    }

    const childCount = childrenOf(branches, index);
    visible.push({ ...branch, hasChildren: childCount > 0, childCount });

    if (childCount > 0 && collapsed.has(branch.row.id)) hiddenBelow = branch.depth;
  });

  return visible;
}
