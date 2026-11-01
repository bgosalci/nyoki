/**
 * What the admin's open pages hear about what waits on the shop - shoppers'
 * questions to answer and reviews to read: the answer of the waiting route
 * they ask every few seconds, and what a toast says of it.
 */

export interface QuestionArrival {
  name: string;
  productName: string | null;
}

export interface ReviewArrival {
  /** The name shown with the review. */
  name: string;
  productName: string;
  /** Changed since it was first written, and so waiting to be read again. */
  changed: boolean;
}

export interface Waiting<Arrival> {
  /** Waiting, all told. */
  waiting: number;
  /** Arrived since the time asked about, up to `checkedAt`. */
  arrived: number;
  /** The newest of those. */
  newest: Arrival | null;
}

export interface WaitingSnapshot {
  questions: Waiting<QuestionArrival>;
  reviews: Waiting<ReviewArrival>;
  /** When the server looked: the next ask counts from here, so nothing is counted twice. */
  checkedAt: string;
}

/** "New question from Ada about Girl's Coat", or "3 new questions". */
export function questionArrival(arrived: number, newest: QuestionArrival | null): string {
  if (arrived > 1 || !newest) return `${arrived} new question${arrived === 1 ? "" : "s"}`;
  return `New question from ${newest.name}${newest.productName ? ` about ${newest.productName}` : ""}`;
}

/** "New review of Robin Card from Ada L.", or "2 reviews to read". */
export function reviewArrival(arrived: number, newest: ReviewArrival | null): string {
  if (arrived > 1 || !newest) return `${arrived} review${arrived === 1 ? "" : "s"} to read`;
  return `${newest.changed ? "Changed" : "New"} review of ${newest.productName} from ${newest.name}`;
}

const several = (count: number, one: string) => `${count} ${one}${count === 1 ? "" : "s"}`;

/** "2 questions and 1 review waiting", said whole for the phone's Menu button; null when nothing waits. */
export function waitingSummary({ questions, reviews }: { questions: number; reviews: number }): string | null {
  const parts = [questions > 0 ? several(questions, "question") : null, reviews > 0 ? several(reviews, "review") : null].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" and ")} waiting` : null;
}
