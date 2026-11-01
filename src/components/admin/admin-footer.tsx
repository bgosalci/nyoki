import { ui } from "@/lib/brand/ui";

/** Height shared with the layout's bottom padding. */
export const FOOTER_HEIGHT_CLASS = "h-12";

export function AdminFooter({
  email,
  role,
  signOut,
}: {
  email: string;
  role: "OWNER" | "STAFF";
  signOut: () => Promise<void>;
}) {
  return (
    <footer
      role="contentinfo"
      className={`fixed inset-x-0 bottom-0 z-30 flex ${FOOTER_HEIGHT_CLASS} items-center justify-between gap-4 border-t px-4 text-xs md:px-6 ${ui.panel} ${ui.rule}`}
    >
      {/* A fixed bar 48px tall: on a phone the name wrapped out of it, so it
          is left to wider screens, and the account shortens rather than wraps. */}
      <p className={`hidden sm:block ${ui.mutedOnPanel}`}>Nyoki Handmade · shop admin</p>
      <div className="flex min-w-0 items-center gap-3">
        <p className="min-w-0 truncate">
          <span className={ui.mutedOnPanel}>Signed in as </span>
          {email}
          <span className={ui.mutedOnPanel}> · {role === "OWNER" ? "Owner" : "Staff"}</span>
        </p>
        <form action={signOut}>
          <button type="submit" className={`shrink-0 text-xs whitespace-nowrap ${ui.link}`}>
            Sign out
          </button>
        </form>
      </div>
    </footer>
  );
}
