"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";

const HEART = "M12 20.5 4.7 13.4a4.6 4.6 0 1 1 6.5-6.5l.8.8.8-.8a4.6 4.6 0 1 1 6.5 6.5Z";

/**
 * Save a piece for later.
 *
 * Signed out it is a link to the sign-in form rather than a control that
 * appears to work and quietly cannot - saving needs somewhere to save it to.
 *
 * Signed in it answers immediately and reconciles when the server catches up:
 * a heart that waits on a round trip before filling in feels broken, and
 * getting it wrong costs nothing worse than a heart that fills and empties
 * again.
 */
export function FavouriteButton({
  productId,
  name,
  saved,
  signedIn,
  toggle,
  className = "",
}: {
  productId: string;
  name: string;
  saved: boolean;
  signedIn: boolean;
  toggle: (productId: string) => Promise<void>;
  className?: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  const shared = `grid size-9 place-items-center rounded-full bg-nyoki-white/90 text-nyoki-navy transition-colors hover:bg-nyoki-white ${className}`;

  if (!signedIn) {
    return (
      <Link href="/account/sign-in" aria-label={`Sign in to save ${name}`} title="Sign in to save" className={shared}>
        <Heart filled={false} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? `Remove ${name} from your saved pieces` : `Save ${name}`}
      title={optimistic ? "Saved" : "Save for later"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await toggle(productId);
        })
      }
      className={shared}
    >
      <Heart filled={optimistic} />
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d={HEART} />
    </svg>
  );
}
