"use client";

import { useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { formSnapshot, linkLeavingPage } from "@/lib/forms/leaving";

/**
 * One list, not a new empty one each render: it is an effect dependency, and
 * a new one would re-run the baseline effect on every render - taking
 * whatever is typed at that moment as "unchanged".
 */
const NOTHING_IGNORED: readonly string[] = [];

/**
 * Asks before a page with unsaved changes is left.
 *
 * Changed means the form would post something different from what it did
 * when the page loaded, or when it was last saved - so a change put back is
 * no change, and a field that only works something out is not one either.
 *
 * Links are caught at the window, in the capture phase, before any link's
 * own handler: that is before React's (attached to its root, lower down) and
 * so before next/link starts a navigation. Every link on the page is covered
 * - the sidebar, the tabs, Back, Previous and Next - rather than only those
 * someone remembered to wire up. Choosing to leave clicks the same link
 * again, so it navigates exactly as it would have.
 *
 * Closing or reloading the tab can only be warned about by the browser, in
 * its own words; beforeunload asks it to.
 */
export function UnsavedChanges({
  formRef,
  saved,
  ignore = NOTHING_IGNORED,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  /**
   * A new value each time the form is saved successfully, null otherwise.
   * What the form holds then becomes what counts as unchanged.
   */
  saved: object | null;
  /** Fields never saved, whose changes are not changes. Keep it a constant. */
  ignore?: readonly string[];
}) {
  const baseline = useRef<string | null>(null);
  const following = useRef(false);
  const [leavingBy, setLeavingBy] = useState<HTMLAnchorElement | null>(null);

  // On arrival, and after every save that went through.
  useEffect(() => {
    const form = formRef.current;
    if (form && (saved !== null || baseline.current === null)) baseline.current = formSnapshot(form, ignore);
  }, [formRef, saved, ignore]);

  useEffect(() => {
    const changed = () => {
      const form = formRef.current;
      return form !== null && baseline.current !== null && formSnapshot(form, ignore) !== baseline.current;
    };

    function onClick(event: MouseEvent) {
      if (following.current) return;
      const anchor = linkLeavingPage(event, window.location.href);
      if (!anchor || !changed()) return;
      event.preventDefault();
      event.stopPropagation();
      setLeavingBy(anchor);
    }

    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!changed()) return;
      event.preventDefault();
      // Safari still wants this as well.
      event.returnValue = "";
    }

    window.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [formRef, ignore]);

  function leave() {
    const anchor = leavingBy;
    setLeavingBy(null);
    if (!anchor) return;
    if (!anchor.isConnected) {
      window.location.assign(anchor.href);
      return;
    }
    following.current = true;
    try {
      anchor.click();
    } finally {
      following.current = false;
    }
  }

  return (
    <ConfirmDialog
      open={leavingBy !== null}
      title="Leave without saving?"
      description="Your changes on this page have not been saved. Leave and they are lost."
      confirmLabel="Leave without saving"
      onConfirm={leave}
      onCancel={() => setLeavingBy(null)}
    />
  );
}
