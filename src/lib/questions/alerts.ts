/**
 * What the admin's open pages hear about new questions: the answer of the
 * waiting route they ask every few seconds, and what a toast says of it.
 */

export interface Arrival {
  name: string;
  productName: string | null;
}

export interface WaitingSnapshot {
  /** Not yet marked answered, all told. */
  waiting: number;
  /** Arrived since the time asked about, up to `checkedAt`. */
  arrived: number;
  /** Who sent the newest of those, and about what. */
  newest: Arrival | null;
  /** When the server looked: the next ask counts from here, so nothing is counted twice. */
  checkedAt: string;
}

/** "New question from Ada about Girl's Coat", or "3 new questions". */
export function arrivalMessage(arrived: number, newest: Arrival | null): string {
  if (arrived > 1 || !newest) return `${arrived} new question${arrived === 1 ? "" : "s"}`;
  return `New question from ${newest.name}${newest.productName ? ` about ${newest.productName}` : ""}`;
}
