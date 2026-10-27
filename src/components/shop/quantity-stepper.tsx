"use client";

/**
 * How many, with one fewer and one more either side: a pill in the page's
 * own beige, as the customiser's quantity is. A button that cannot go
 * further says so by being switched off. 40px buttons, or 34px in a list.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label = "Quantity",
  small = false,
  disabled = false,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  /** What the group is called to a screen reader: "Quantity of Snowman Card". */
  label?: string;
  small?: boolean;
  disabled?: boolean;
}) {
  const size = small ? "size-[34px]" : "size-10";

  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full bg-nyoki-beige ring-1 ring-nyoki-light-slate">
      <Step label="One fewer" className={size} disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
        <path d="M5 10h10" />
      </Step>
      {/* A span rather than an <output>: that is a status, and the page's own notices are the statuses. */}
      <span aria-live="polite" className={`${small ? "w-7 text-[15px]" : "w-8"} text-center tabular-nums`}>
        {value}
      </span>
      <Step label="One more" className={size} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
        <path d="M5 10h10M10 5v10" />
      </Step>
    </div>
  );
}

function Step({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid place-items-center rounded-full text-nyoki-navy transition-colors duration-150 hover:bg-nyoki-accent-beige focus-visible:outline-2 focus-visible:outline-nyoki-navy disabled:opacity-35 disabled:hover:bg-transparent motion-reduce:transition-none ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="none" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="size-4 stroke-current">
        {children}
      </svg>
    </button>
  );
}
