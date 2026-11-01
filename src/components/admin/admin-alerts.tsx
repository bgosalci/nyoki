"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { questionArrival, reviewArrival, type WaitingSnapshot } from "@/lib/admin/waiting";
import { ui } from "@/lib/brand/ui";

/** How often an open admin page asks whether questions or reviews have arrived. */
export const POLL_MS = 10_000;

/** How long the toast saying so stays up. */
const TOAST_MS = 12_000;

// Named for questions, which had the chime first: renamed, it would switch
// the sound back on for everyone who had switched it off.
const SOUND_KEY = "nyoki-admin-question-sound";

export interface WaitingCounts {
  /** Questions not yet marked answered. */
  questions: number;
  /** Reviews waiting to be read. */
  reviews: number;
}

const WaitingContext = createContext<WaitingCounts>({ questions: 0, reviews: 0 });

/** What waits, as last heard: nothing outside the provider. */
export function useWaiting(): WaitingCounts {
  return useContext(WaitingContext);
}

// The sound is on unless switched off, remembered per browser.
const soundListeners = new Set<() => void>();

function subscribeSound(listener: () => void): () => void {
  soundListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    soundListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function soundOn(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function setSound(on: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Not remembering is a smaller problem than not working.
  }
  for (const listener of soundListeners) listener();
}

let audio: AudioContext | null = null;

/**
 * A browser lets a page make a sound only once someone has used it, so the
 * first click or key press on an admin page readies one; until then a chime
 * is simply not heard.
 */
function readyAudio(): AudioContext | null {
  const Context = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  audio ??= new Context();
  if (audio.state === "suspended") void audio.resume().catch(() => {});
  return audio;
}

/** Two soft rising notes, made in the browser - no sound file to fetch. */
export function playChime(): void {
  const context = readyAudio();
  if (!context) return;
  const now = context.currentTime;
  for (const [frequency, offset] of [
    [880, 0],
    [1318.5, 0.16],
  ]) {
    const tone = context.createOscillator();
    const level = context.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    level.gain.setValueAtTime(0.0001, now + offset);
    level.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.02);
    level.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);
    tone.connect(level).connect(context.destination);
    tone.start(now + offset);
    tone.stop(now + offset + 0.55);
  }
}

/**
 * Pages showing what waits, refreshed when something arrives. Any other is
 * left alone: a refresh in the middle of editing a product must not cost a
 * thing.
 */
const showsWaiting = (pathname: string) => pathname === "/admin" || pathname === "/admin/questions" || pathname === "/admin/reviews";

interface Toast {
  text: string;
  href: string;
  /** Said whole, for the Open link. */
  open: string;
}

/**
 * Keeps every admin page told about what waits on the shop: shoppers'
 * questions and reviews. It holds the counts, for the sidebar, and - when one
 * arrives - chimes and shows a toast saying who sent what about which piece.
 * It asks the waiting route every ten seconds while a page is open, background
 * tabs included, and at once when the tab is come back to. Ten seconds is as
 * instant as a page can be without a push service behind it.
 */
export function AdminAlertsProvider({
  initialWaiting,
  since,
  playSound = playChime,
  children,
}: {
  /** The counts when the page was drawn. */
  initialWaiting: WaitingCounts;
  /** When the page was drawn, on the server's clock: the first ask counts from here. */
  since: string;
  playSound?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [waiting, setWaiting] = useState(initialWaiting);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sinceRef = useRef(since);
  // What the asking reads, kept current without starting it over.
  const latest = useRef({ pathname, router, playSound });
  useEffect(() => {
    latest.current = { pathname, router, playSound };
  });

  // Fresher counts from the server - after answering or publishing one - win.
  const [basis, setBasis] = useState(initialWaiting);
  if (basis.questions !== initialWaiting.questions || basis.reviews !== initialWaiting.reviews) {
    setBasis(initialWaiting);
    setWaiting(initialWaiting);
  }

  useEffect(() => {
    let stopped = false;
    let asking = false;

    async function ask() {
      if (asking) return;
      asking = true;
      try {
        const response = await fetch(`/admin/waiting?since=${encodeURIComponent(sinceRef.current)}`, { cache: "no-store" });
        if (!response.ok) return;
        const { questions, reviews, checkedAt } = (await response.json()) as WaitingSnapshot;
        if (stopped) return;
        sinceRef.current = checkedAt;
        setWaiting({ questions: questions.waiting, reviews: reviews.waiting });

        const arrived: Toast[] = [];
        if (questions.arrived > 0) {
          arrived.push({ text: questionArrival(questions.arrived, questions.newest), href: "/admin/questions", open: "Open questions" });
        }
        if (reviews.arrived > 0) {
          arrived.push({ text: reviewArrival(reviews.arrived, reviews.newest), href: "/admin/reviews", open: "Open reviews" });
        }
        if (arrived.length > 0) {
          // One chime, however much arrived at once.
          if (soundOn()) latest.current.playSound();
          setToasts(arrived);
          if (showsWaiting(latest.current.pathname)) latest.current.router.refresh();
        }
      } catch {
        // Offline, or signed out and sent to the sign-in page: next time.
      } finally {
        asking = false;
      }
    }

    const timer = setInterval(ask, POLL_MS);
    const onReturn = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pointerdown", readyAudio, { once: true });
    window.addEventListener("keydown", readyAudio, { once: true });
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pointerdown", readyAudio);
      window.removeEventListener("keydown", readyAudio);
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => setToasts([]), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <WaitingContext.Provider value={waiting}>
      {children}
      {toasts.length > 0 ? (
        // Above the fixed footer, clear of the page's own Save buttons.
        <div role="status" className={`fixed right-4 bottom-16 z-50 flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${ui.card} ${ui.rule}`}>
          <ul className="flex flex-1 flex-col gap-2">
            {toasts.map((toast) => (
              <li key={toast.href} className="flex items-baseline gap-3">
                <p className="flex-1">{toast.text}</p>
                <Link href={toast.href} aria-label={toast.open} onClick={() => setToasts([])} className={ui.link}>
                  Open
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" aria-label="Dismiss" title="Dismiss" onClick={() => setToasts([])} className={`rounded px-1.5 ${ui.navItem}`}>
            ×
          </button>
        </div>
      ) : null}
    </WaitingContext.Provider>
  );
}

/** The switch for the chime, on the Questions and Reviews pages. */
export function AlertSoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);

  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input type="checkbox" checked={on} onChange={(event) => setSound(event.target.checked)} className={`size-4 ${ui.checkbox}`} />
      Play a sound when a question or review arrives
    </label>
  );
}
