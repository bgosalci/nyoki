/**
 * For tests that a crafted input is answered at once: the difference between
 * a pattern that matches in a single pass and one that backtracks is about a
 * millisecond against whole seconds (5,500ms for 100,000 dots), and only a
 * clock can see it.
 *
 * A clock alone also sees whatever else the machine is doing, so a single
 * timed run failed about one full test run in three. A busy machine can only
 * ever add time, so the fastest of a few runs is close to what the call really
 * costs, while something truly slow is slow every time. Build the input
 * outside `run`: a form holding 100,000 characters took up to 42ms to build
 * under load, against 0.2ms to check, and that was most of what was timed.
 */

/** Far above what is there now, under 4ms even at a load of 40, and far below the seconds a backtracking pattern takes. */
export const QUICK_MS = 100;

const ATTEMPTS = 3;

/** The fastest of up to three runs, in milliseconds; stops at the first under QUICK_MS. */
export function fastestRun(run: () => unknown): number {
  let fastest = Infinity;
  for (let attempt = 0; attempt < ATTEMPTS && fastest >= QUICK_MS; attempt += 1) {
    const start = performance.now();
    run();
    fastest = Math.min(fastest, performance.now() - start);
  }
  return fastest;
}
