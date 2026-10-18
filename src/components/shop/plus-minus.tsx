const BAR = "absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full bg-current";

/**
 * A + that rolls over into a − as the section it marks opens, and back again
 * as it closes: the whole mark turns half over while its upright bar lies
 * down. Still for anyone whose system asks for less motion.
 *
 * It sits in a circle like the Save heart's (size-9, light-slate border), so
 * the two line up, and so do the words beside them. Lives inside a <details>
 * with the group class.
 */
export function PlusMinus() {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full border border-nyoki-light-slate bg-nyoki-white/90"
    >
      <span
        data-mark="plus-minus"
        className="relative size-3.5 text-black transition-transform duration-500 ease-in-out group-open:rotate-180 motion-reduce:transition-none"
      >
        <span data-bar="across" className={BAR} />
        <span
          data-bar="upright"
          className={`${BAR} rotate-90 transition-transform duration-500 ease-in-out group-open:rotate-0 motion-reduce:transition-none`}
        />
      </span>
    </span>
  );
}
