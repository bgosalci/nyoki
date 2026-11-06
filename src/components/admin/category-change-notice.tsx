import { ui } from "@/lib/brand/ui";

/** What filing or unfiling pieces did, or that it could not be done. */
export const CATEGORY_CHANGE_FAILED = "That could not be saved, so the categories are as they were. Try it again.";

export function CategoryChangeNotice({ lines, className = "" }: { lines: readonly string[]; className?: string }) {
  return (
    <div role="status" className={`flex flex-col gap-1.5 rounded-md border p-3 text-sm ${ui.card} ${ui.ruleOnPage} ${className}`}>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}
