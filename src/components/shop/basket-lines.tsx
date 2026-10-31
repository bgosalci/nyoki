"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";

import type { AddResult, RemovedLine } from "@/app/(shop)/basket/actions";
import { ConfirmDialog } from "@/components/shop/confirm-dialog";
import { QuantityStepper } from "@/components/shop/quantity-stepper";
import type { PricedLine } from "@/lib/basket/review";
import { formatPence } from "@/lib/money";

/**
 * The basket's lines: each piece with its choices in words, what one costs
 * and what the line comes to, how many, and Remove.
 *
 * A quantity shows at once and is saved behind it; the server's answer then
 * takes over, cut to the stock if need be. Remove asks first, and once the
 * line is out the notice above the lines offers to put it back for a while -
 * checked again like any piece going in.
 *
 * The actions are props, so the lines can be tested without a server.
 */
export function BasketLines({
  lines,
  changeQuantity,
  removeLine,
  putBack,
}: {
  lines: PricedLine[];
  changeQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<RemovedLine | null>;
  putBack: (removed: RemovedLine) => Promise<AddResult>;
}) {
  const [confirming, setConfirming] = useState<PricedLine | null>(null);
  const [removed, setRemoved] = useState<RemovedLine | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // A while to change one's mind, then gone.
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 10000);
    return () => clearTimeout(timer);
  }, [removed]);

  const remove = (lineId: string) =>
    startTransition(async () => {
      const line = await removeLine(lineId);
      setMessage(null);
      setRemoved(line);
    });

  const restore = (line: RemovedLine) =>
    startTransition(async () => {
      setRemoved(null);
      const result = await putBack(line);
      setMessage(result.ok ? null : result.message);
    });

  return (
    <div className="flex flex-col gap-4">
      {removed || message ? (
        <p role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-nyoki-accent-beige px-5 py-3.5 text-[15px]">
          {removed ? (
            <>
              <span>Removed {removed.name}.</span>
              <button type="button" onClick={() => restore(removed)} className="font-medium underline underline-offset-4">
                Put it back
              </button>
            </>
          ) : (
            message
          )}
        </p>
      ) : null}

      {lines.length > 0 ? (
        <ul className="rounded-[20px] border-[1.5px] border-nyoki-light-slate bg-nyoki-white px-5 shadow-[0_1px_2px_rgb(0_0_0/0.03),0_10px_30px_-18px_rgb(0_0_0/0.18)] sm:px-7">
          {lines.map((line) => (
            <Line key={line.id} line={line} onQuantity={(quantity) => changeQuantity(line.id, quantity)} onRemove={() => setConfirming(line)} />
          ))}
        </ul>
      ) : null}

      {confirming ? (
        <ConfirmDialog
          open
          title={`Remove ${confirming.name}?`}
          description="It comes out of your basket."
          confirmLabel="Remove"
          cancelLabel="Keep it"
          onConfirm={() => {
            setConfirming(null);
            remove(confirming.id);
          }}
          onCancel={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}

function Line({ line, onQuantity, onRemove }: { line: PricedLine; onQuantity: (quantity: number) => Promise<void>; onRemove: () => void }) {
  const [quantity, setQuantity] = useOptimistic(line.quantity);
  const [, startTransition] = useTransition();
  const nameId = `line-${line.id}`;

  const change = (value: number) =>
    startTransition(async () => {
      setQuantity(value);
      await onQuantity(value);
    });

  const atMost = quantity >= line.maxQuantity;

  return (
    <li
      aria-labelledby={nameId}
      className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-4 gap-y-3 border-nyoki-light-slate py-5 not-first:border-t sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-x-6 sm:py-6"
    >
      <Link href={`/product/${line.slug}`} tabIndex={-1} aria-hidden="true" className="relative aspect-square overflow-hidden rounded-lg bg-nyoki-soft-ash">
        {line.image ? <Image src={line.image} alt="" fill sizes="120px" className="object-cover" /> : null}
      </Link>

      <div className="min-w-0">
        <h2 id={nameId} className="leading-snug font-medium text-nyoki-ink sm:text-[17px]">
          <Link href={`/product/${line.slug}`} className="hover:underline hover:underline-offset-4">
            {line.name}
          </Link>
        </h2>

        {line.details.length > 0 ? (
          <dl className="mt-2 flex flex-col gap-0.5 text-[13px] sm:text-sm">
            {line.details.map((row) => (
              <div key={row.label}>
                <dt className="inline text-nyoki-text-dark">{row.label}: </dt>
                <dd className="inline font-medium break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-nyoki-text-dark tabular-nums sm:text-sm">
          <span>{formatPence(line.unitPence)} each</span>
          {line.wasUnitPence !== null ? (
            <>
              <span className="sr-only">was</span>
              <s>{formatPence(line.wasUnitPence)}</s>
            </>
          ) : null}
          {line.saleName ? (
            <span className="rounded-[3px] bg-nyoki-sage px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-nyoki-ink uppercase">
              {line.saleName}
            </span>
          ) : null}
          {line.madeToOrder ? (
            <span className="rounded-[3px] bg-nyoki-accent-beige px-2 py-0.5 text-[11px] font-semibold tracking-[0.12em] text-nyoki-navy uppercase">
              Made to order{line.leadTimeDays ? ` · ${line.leadTimeDays} days` : ""}
            </span>
          ) : null}
        </p>
      </div>

      <p className="hidden text-right text-[17px] font-medium text-nyoki-ink tabular-nums sm:block">{formatPence(line.totalPence)}</p>

      <div className="col-span-full flex items-center gap-4 sm:col-start-2 sm:col-end-3 sm:-mt-1">
        <QuantityStepper small value={quantity} max={line.maxQuantity} onChange={change} label={`Quantity of ${line.name}`} />
        <button type="button" onClick={onRemove} className="text-sm text-nyoki-text-dark underline underline-offset-4 hover:text-nyoki-navy">
          Remove
        </button>
        {atMost && line.maxQuantity < 99 ? <span className="text-[13px] text-nyoki-text-dark">That&apos;s all we have</span> : null}
        <span className="ml-auto font-medium text-nyoki-ink tabular-nums sm:hidden">{formatPence(line.totalPence)}</span>
      </div>
    </li>
  );
}
