"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { ui } from "@/lib/brand/ui";
import { arrivalMessage, type WaitingSnapshot } from "@/lib/questions/alerts";

/** How often an open admin page asks whether questions have arrived. */
export const POLL_MS = 10_000;

/** How long the toast saying so stays up. */
const TOAST_MS = 12_000;

const SOUND_KEY = "nyoki-admin-question-sound";

const WaitingContext = createContext(0);

/** Questions not yet marked answered, as last heard: none outside the provider. */
export function useWaitingQuestions(): number {
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
 * Pages showing the questions, refreshed when one arrives. Any other is left
 * alone: a refresh in the middle of editing a product must not cost a thing.
 */
const showsQuestions = (pathname: string) => pathname === "/admin" || pathname === "/admin/questions";

/**
 * Keeps every admin page told about shoppers' questions: the count waiting,
 * for the sidebar, and - when one arrives - a chime and a toast saying who
 * asked about what. It asks the waiting route every ten seconds while a page
 * is open, background tabs included, and at once when the tab is come back to.
 * Ten seconds is as instant as a page can be without a push service behind it.
 */
export function QuestionAlertsProvider({
  initialWaiting,
  since,
  playSound = playChime,
  children,
}: {
  /** The count when the page was drawn. */
  initialWaiting: number;
  /** When the page was drawn, on the server's clock: the first ask counts from here. */
  since: string;
  playSound?: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [waiting, setWaiting] = useState(initialWaiting);
  const [toast, setToast] = useState<string | null>(null);
  const sinceRef = useRef(since);
  // What the asking reads, kept current without starting it over.
  const latest = useRef({ pathname, router, playSound });
  useEffect(() => {
    latest.current = { pathname, router, playSound };
  });

  // A fresher count from the server - after marking one answered - wins.
  const [basis, setBasis] = useState(initialWaiting);
  if (basis !== initialWaiting) {
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
        const response = await fetch(`/admin/questions/waiting?since=${encodeURIComponent(sinceRef.current)}`, { cache: "no-store" });
        if (!response.ok) return;
        const snapshot = (await response.json()) as WaitingSnapshot;
        if (stopped) return;
        sinceRef.current = snapshot.checkedAt;
        setWaiting(snapshot.waiting);
        if (snapshot.arrived > 0) {
          if (soundOn()) latest.current.playSound();
          setToast(arrivalMessage(snapshot.arrived, snapshot.newest));
          if (showsQuestions(latest.current.pathname)) latest.current.router.refresh();
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
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <WaitingContext.Provider value={waiting}>
      {children}
      {toast ? (
        // Above the fixed footer, clear of the page's own Save buttons.
        <div role="status" className={`fixed right-4 bottom-16 z-50 flex max-w-sm items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${ui.card} ${ui.rule}`}>
          <p className="flex-1">{toast}</p>
          <Link href="/admin/questions" aria-label="Open questions" onClick={() => setToast(null)} className={ui.link}>
            Open
          </Link>
          <button type="button" aria-label="Dismiss" title="Dismiss" onClick={() => setToast(null)} className={`rounded px-1.5 ${ui.navItem}`}>
            ×
          </button>
        </div>
      ) : null}
    </WaitingContext.Provider>
  );
}

/** The switch for the chime, on the Questions page. */
export function QuestionSoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);

  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input type="checkbox" checked={on} onChange={(event) => setSound(event.target.checked)} className={`size-4 ${ui.checkbox}`} />
      Play a sound when a question arrives
    </label>
  );
}
